from django.db import models
from users.models import User
import uuid

class Classroom(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='taught_classrooms')
    created_at = models.DateTimeField(auto_now_add=True)
    join_code = models.CharField(max_length=10, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = uuid.uuid4().hex[:8].upper()
            while Classroom.objects.filter(join_code=self.join_code).exists():
                self.join_code = uuid.uuid4().hex[:8].upper()
        super(Classroom, self).save(*args, **kwargs)

    def __str__(self):
        return self.name

class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='enrollments')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'classroom']

    def __str__(self):
        return f"{self.student} - {self.classroom}"