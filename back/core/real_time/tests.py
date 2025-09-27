"""
Test suite for real_time app: SessionConsumer, WebSocket authentication, and real-time events.
"""
import json
from django.utils import timezone
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from core.asgi import application
print(f"Type of application: {type(application)}")
print(f"Application object: {application}")
from rest_framework_simplejwt.tokens import RefreshToken
from classrooms.models import Classroom, Enrollment
from session.models import Session

User = get_user_model()

class RealTimeWebSocketTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.instructor = User.objects.create_user(email='instructor@test.com', password='password', role='instructor', full_name='Instructor')
        self.student = User.objects.create_user(email='student@test.com', password='password', role='student', full_name='Student')
        self.classroom = Classroom.objects.create(name='Test Class', instructor=self.instructor, join_code='TEST')
        self.session = Session.objects.create(classroom=self.classroom, is_active=True, start_time=timezone.now())
        self.enrollment = Enrollment.objects.create(student=self.student, classroom=self.classroom)

        self.instructor_token = str(RefreshToken.for_user(self.instructor).access_token)
        self.student_token = str(RefreshToken.for_user(self.student).access_token)

    async def test_student_connect_and_disconnect_successfully(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.student_token}")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'connection_established')

        await communicator.disconnect()

    async def test_instructor_connect_successfully(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.instructor_token}")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_connection_fails_with_invalid_token(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token=invalidtoken")
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4002)

    async def test_student_can_send_focus_update(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.student_token}")
        await communicator.connect()
        await communicator.receive_json_from() # Clear connection message

        await communicator.send_json_to({'type': 'focus_update', 'focus_score': 0.85})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'focus_update_ack')
        await communicator.disconnect()

    async def test_instructor_cannot_send_focus_update(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.instructor_token}")
        await communicator.connect()
        await communicator.receive_json_from() # Clear connection message

        await communicator.send_json_to({'type': 'focus_update', 'focus_score': 0.85})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertEqual(response['message'], 'Only students can submit focus scores')
        await communicator.disconnect()

    async def test_instructor_can_send_timer_update(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.instructor_token}")
        instructor_communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.instructor_token}")
        await communicator.connect()
        await instructor_communicator.connect()
        await communicator.receive_json_from()
        await instructor_communicator.receive_json_from()

        await instructor_communicator.send_json_to({'type': 'timer_update', 'elapsed_time': 120})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'timer_update')
        self.assertEqual(response['elapsed_time'], 120)

        await communicator.disconnect()
        await instructor_communicator.disconnect()

    async def test_student_cannot_send_timer_update(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.student_token}")
        await communicator.connect()
        await communicator.receive_json_from()

        await communicator.send_json_to({'type': 'timer_update', 'elapsed_time': 120})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertEqual(response['message'], 'Only instructors can update timer')
        await communicator.disconnect()

    async def test_instructor_can_end_session(self):
        communicator = WebsocketCommunicator(application, f"/ws/session/{self.session.id}/?token={self.instructor_token}")
        await communicator.connect()
        await communicator.receive_json_from()

        await communicator.send_json_to({'type': 'session_control', 'control_type': 'end'})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'session_control')
        self.assertEqual(response['control_type'], 'end')

        self.session.refresh_from_db()
        self.assertFalse(self.session.is_active)
        await communicator.disconnect()