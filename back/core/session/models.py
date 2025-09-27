from django.db import models
from classrooms.models import Classroom
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

class Session(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.classroom.name} - {self.start_time}"
    
    def save(self, *args, **kwargs):
        # Call the parent save method
        super().save(*args, **kwargs)
        
        # Update classroom session count
        if self.classroom:
            # Count all sessions for this classroom
            session_count = Session.objects.filter(classroom=self.classroom).count()
            # Update the classroom's session count field if it exists
            if hasattr(self.classroom, 'session_count'):
                self.classroom.session_count = session_count
                self.classroom.save(update_fields=['session_count'])
    
    def get_websocket_url(self):
        domain = settings.DOMAIN if hasattr(settings, 'DOMAIN') else 'localhost:8000'
        return f"ws://{domain}/ws/session/{self.id}/"
    
    def broadcast_to_session(self, message_type, data):
        """Broadcast message to session group - FIXED VERSION"""
        try:
            channel_layer = get_channel_layer()
            group_name = f'session_{self.id}'
            
            # Use async_to_sync to call async channel layer method
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': message_type,  # Directly use the message type
                    **data
                }
            )
            logger.debug(f"Broadcasted {message_type} to {group_name}")
        except Exception as e:
            logger.exception(f"Error broadcasting to session {self.id}: {e}")
    
    def end_session(self):
        """End session - FIXED VERSION"""
        from django.utils import timezone
        from performance.models import Performance

        # Only end if not already ended
        if not self.is_active:
            return False

        self.end_time = timezone.now()
        self.is_active = False
        self.save()
        
        # Update performance records
        Performance.objects.filter(session=self).update(attended=False)
        
        # Broadcast session end using the fixed method
        self.broadcast_to_session('session.ended', {
            'message': 'Session has ended',
            'end_time': self.end_time.isoformat()
        })
        
        logger.info(f"Session {self.id} ended at {self.end_time}")
        return True