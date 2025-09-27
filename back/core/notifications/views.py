from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own notifications
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user for the notification
        serializer.save(user=self.request.user)