from rest_framework import serializers
from .models import Session
from classrooms.models import Classroom

class SessionSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    websocket_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = ['id', 'classroom', 'classroom_name', 'start_time', 'end_time', 
                 'is_active', 'websocket_url']
        read_only_fields = ['end_time', 'is_active']
    
    def get_websocket_url(self, obj):
        return obj.get_websocket_url()
    

class SessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['classroom']

class SessionEndSerializer(serializers.Serializer):
    end_time = serializers.DateTimeField(read_only=True)