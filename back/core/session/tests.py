
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Session
from classrooms.models import Classroom
from django.utils import timezone
import uuid
from unittest.mock import patch

User = get_user_model()

class SessionModelsTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email='instructor@example.com',
            password='password123',
            full_name='Instructor User',
            role='instructor'
        )
        self.classroom = Classroom.objects.create(
            name='Test Classroom',
            description='A classroom for testing',
            instructor=self.instructor,
            join_code=str(uuid.uuid4()).split('-')[0]
        )

    def test_session_creation(self):
        session = Session.objects.create(
            classroom=self.classroom,
            start_time=timezone.now()
        )
        self.assertEqual(session.classroom, self.classroom)
        self.assertTrue(session.is_active)

@patch('reports.tasks.generate_session_report_task.delay')
class SessionViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            email='instructor@example.com',
            password='password123',
            full_name='Instructor User',
            role='instructor'
        )
        self.student = User.objects.create_user(
            email='student@example.com',
            password='password123',
            full_name='Student User',
            role='student'
        )
        self.classroom = Classroom.objects.create(
            name='Test Classroom',
            description='A classroom for testing',
            instructor=self.instructor,
            join_code=str(uuid.uuid4()).split('-')[0]
        )
        self.session = Session.objects.create(
            classroom=self.classroom,
            start_time=timezone.now()
        )
        self.client.force_authenticate(user=self.instructor)

    def test_instructor_can_create_session(self, mock_delay):
        url = f'/api/sessions/'
        data = {'classroom': self.classroom.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Session.objects.count(), 2)

    def test_student_cannot_create_session(self, mock_delay):
        self.client.force_authenticate(user=self.student)
        url = f'/api/sessions/'
        data = {'classroom': self.classroom.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_instructor_can_end_session(self, mock_delay):
        url = f'/api/sessions/{self.session.id}/end/'
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.session.refresh_from_db()
        self.assertFalse(self.session.is_active)
        mock_delay.assert_called_once_with(self.session.id)

    def test_student_can_join_session(self, mock_delay):
        self.client.force_authenticate(user=self.student)
        url = f'/api/sessions/{self.session.id}/join/'
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_can_leave_session(self, mock_delay):
        self.client.force_authenticate(user=self.student)
        url = f'/api/sessions/{self.session.id}/leave/'
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # No performance record yet
