from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from core.asgi import application
from classrooms.models import Classroom, Enrollment
from session.models import Session
from performance.models import Performance
from reports.models import Report
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from unittest.mock import patch

User = get_user_model()

class EndToEndWorkflowTest(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            email='e2e_instructor@example.com', password='password', role='instructor', full_name='E2E Instructor')
        self.student = User.objects.create_user(
            email='e2e_student@example.com', password='password', role='student', full_name='E2E Student')

    @patch('reports.utils.generate_focus_chart')
    @patch('reports.utils.generate_student_focus_chart')
    async def test_full_classroom_workflow(self, mock_student_chart, mock_instructor_chart):
        mock_instructor_chart.return_value = b''
        mock_student_chart.return_value = b''

        # 1. Instructor creates a classroom
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post('/api/classrooms/', {'name': 'E2E Test Class', 'description': 'End-to-end test'})
        self.assertEqual(response.status_code, 201)
        classroom = Classroom.objects.get(id=response.data['id'])
        join_code = classroom.join_code

        # 2. Student joins the classroom
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/classrooms/join/', {'join_code': join_code})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Enrollment.objects.filter(student=self.student, classroom=classroom).exists())

        # 3. Instructor starts a session
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/classrooms/{classroom.id}/sessions/', {'name': 'E2E Session'})
        self.assertEqual(response.status_code, 201)
        session = Session.objects.get(id=response.data['id'])

        # 4. Student connects to the session via WebSocket
        student_token = str(RefreshToken.for_user(self.student).access_token)
        communicator = WebsocketCommunicator(application, f'/ws/session/{session.id}/?token={student_token}')
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from() # Connection established message

        # 5. Student sends focus data
        await communicator.send_json_to({'type': 'focus_update', 'focus_score': 0.95})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'focus_update_ack')

        # 6. Instructor ends the session
        self.client.force_authenticate(user=self.instructor)
        response = self.client.patch(f'/api/sessions/{session.id}/', {'is_active': False})
        self.assertEqual(response.status_code, 200)

        # 7. A report is generated for the session
        from reports.tasks import generate_session_report_task
        generate_session_report_task(session.id)
        self.assertTrue(Report.objects.filter(session=session, user=self.instructor).exists())
        self.assertTrue(Report.objects.filter(session=session, user=self.student).exists())

        await communicator.disconnect()