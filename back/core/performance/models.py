from django.db import models
from users.models import User
from session.models import Session

class Performance(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='performances')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='performances')
    focus_score = models.FloatField(null=True, blank=True, default=0.0)
    attended = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)


    class Meta:
        unique_together = ['session', 'student']

    def __str__(self):
        return f"{self.student} - {self.session}"