from rest_framework import serializers
from .models import Performance
from users.models import User
from session.models import Session

class PerformanceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Performance
        fields = ['focus_score', 'attended']
        read_only_fields = ['student']

class PerformanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = Performance
        fields = ['id', 'session', 'student', 'student_name', 'focus_score', 'attended', 'timestamp']

class PerformanceAggregateSerializer(serializers.Serializer):
    avg_focus_score = serializers.FloatField()
    student_count = serializers.IntegerField()
    present_count = serializers.IntegerField()