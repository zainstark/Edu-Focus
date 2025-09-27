from rest_framework import serializers
from .models import Classroom, Enrollment
from users.models import User

class ClassroomSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Classroom
        fields = ['id', 'name', 'description', 'instructor', 'instructor_name', 'created_at', 'join_code', 'student_count']
        read_only_fields = ['instructor', 'join_code']

    def get_student_count(self, obj):
        return obj.enrollments.count()

class ClassroomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ['name', 'description']

class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_name', 'classroom', 'joined_at']
        read_only_fields = ['student', 'joined_at']

class JoinClassroomSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=10)