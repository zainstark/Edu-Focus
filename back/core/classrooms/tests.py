from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from .models import Classroom, Enrollment
from .serializers import ClassroomSerializer, EnrollmentSerializer
import uuid

User = get_user_model()

class ClassroomModelTest(TestCase):
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

    def test_classroom_creation(self):
        self.assertEqual(self.classroom.name, 'Test Classroom')
        self.assertEqual(self.classroom.instructor, self.instructor)
        self.assertEqual(str(self.classroom), 'Test Classroom')

    def test_enrollment_creation(self):
        enrollment = Enrollment.objects.create(
            student=self.student,
            classroom=self.classroom
        )
        self.assertEqual(enrollment.student, self.student)
        self.assertEqual(enrollment.classroom, self.classroom)
        self.assertEqual(str(enrollment), f'{self.student} - {self.classroom}')

    def test_unique_together_enrollment(self):
        Enrollment.objects.create(student=self.student, classroom=self.classroom)
        with self.assertRaises(IntegrityError):
            Enrollment.objects.create(student=self.student, classroom=self.classroom)

class ClassroomSerializerTest(APITestCase):
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

    def test_classroom_serializer(self):
        serializer = ClassroomSerializer(instance=self.classroom)
        data = serializer.data
        self.assertEqual(data['name'], self.classroom.name)
        self.assertEqual(data['instructor_name'], self.instructor.full_name)

    def test_enrollment_serializer(self):
        enrollment = Enrollment.objects.create(student=self.student, classroom=self.classroom)
        serializer = EnrollmentSerializer(instance=enrollment)
        data = serializer.data
        self.assertEqual(data['student_name'], self.student.full_name)
        self.assertEqual(data['classroom'], self.classroom.id)

class ClassroomViewSetTest(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email='instructor@example.com', password='password123', full_name='Instructor', role='instructor')
        self.student1 = User.objects.create_user(
            email='student1@example.com', password='password123', full_name='Student 1', role='student')
        self.student2 = User.objects.create_user(
            email='student2@example.com', password='password123', full_name='Student 2', role='student')
        self.classroom = Classroom.objects.create(
            name='Math 101', description='Algebra', instructor=self.instructor, join_code='MATH101')
        self.enrollment = Enrollment.objects.create(student=self.student1, classroom=self.classroom)

    def test_instructor_can_create_classroom(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post('/api/classrooms/', {'name': 'History 101', 'description': 'World History'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_cannot_create_classroom(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.post('/api/classrooms/', {'name': 'Biology 101', 'description': 'Intro to Biology'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_can_view_their_classrooms(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get('/api/classrooms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_student_can_view_enrolled_classrooms(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.get('/api/classrooms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_student_cannot_view_other_classrooms(self):
        self.client.force_authenticate(user=self.student2)
        response = self.client.get('/api/classrooms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_student_can_join_classroom(self):
        self.client.force_authenticate(user=self.student2)
        response = self.client.post('/api/classrooms/join/', {'join_code': 'MATH101'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Enrollment.objects.filter(student=self.student2, classroom=self.classroom).exists())

    def test_join_invalid_classroom(self):
        self.client.force_authenticate(user=self.student2)
        response = self.client.post('/api/classrooms/join/', {'join_code': 'INVALID'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_instructor_can_update_classroom(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.patch(f'/api/classrooms/{self.classroom.id}/', {'description': 'Advanced Algebra'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.classroom.refresh_from_db()
        self.assertEqual(self.classroom.description, 'Advanced Algebra')

    def test_student_cannot_update_classroom(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.patch(f'/api/classrooms/{self.classroom.id}/', {'description': 'Advanced Algebra'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_can_delete_classroom(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/classrooms/{self.classroom.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Classroom.objects.filter(id=self.classroom.id).exists())

    def test_student_cannot_delete_classroom(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.delete(f'/api/classrooms/{self.classroom.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
