from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from .models import Performance
from session.models import Session
from classrooms.models import Classroom
from django.utils import timezone
import uuid

User = get_user_model()

class PerformanceModelsTest(TestCase):
    def setUp(self):
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

    def test_performance_creation(self):
        performance = Performance.objects.create(
            session=self.session,
            student=self.student,
            focus_score=0.8
        )
        self.assertEqual(performance.session, self.session)
        self.assertEqual(performance.student, self.student)
        self.assertEqual(performance.focus_score, 0.8)

class PerformanceViewSetTest(APITestCase):
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

    def test_student_can_submit_performance(self):
        self.client.force_authenticate(user=self.student)
        url = f'/api/session/{self.session.id}/performances/'
        data = {
            'focus_score': 0.9
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Performance.objects.count(), 1)

    def test_instructor_can_get_aggregate_performance(self):
        Performance.objects.create(
            session=self.session,
            student=self.student,
            focus_score=0.8
        )
        self.client.force_authenticate(user=self.instructor)
        url = f'/api/session/{self.session.id}/performances/aggregate/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['avg_focus_score'], 0.8)

    def test_student_cannot_get_aggregate_performance(self):
        self.client.force_authenticate(user=self.student)
        url = f'/api/session/{self.session.id}/performances/aggregate/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
