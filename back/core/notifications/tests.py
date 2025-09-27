
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from notifications.models import Notification

User = get_user_model()

class NotificationModelTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(email='user@test.com', password='pass', role='student', full_name='Test User')

	def test_create_notification(self):
		notif = Notification.objects.create(user=self.user, message='Test message', is_read=False)
		self.assertEqual(notif.user, self.user)
		self.assertEqual(notif.message, 'Test message')
		self.assertFalse(notif.is_read)

class NotificationAPITests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(email='user@test.com', password='pass', role='student', full_name='Test User')
		self.notification = Notification.objects.create(user=self.user, message='Test message', is_read=False)
		self.client.force_authenticate(user=self.user)

	def test_list_notifications(self):
		url = reverse('notification-list')
		response = self.client.get(url)
		self.assertEqual(response.status_code, 200)
		self.assertIn('results', response.data)

	def test_mark_notification_read(self):
		url = reverse('notification-detail', args=[self.notification.id])
		data = {'is_read': True}
		response = self.client.patch(url, data)
		self.assertEqual(response.status_code, 200)
		self.notification.refresh_from_db()
		self.assertTrue(self.notification.is_read)
