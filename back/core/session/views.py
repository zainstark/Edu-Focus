# sessions/views.py
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Session
from .serializers import SessionSerializer, SessionCreateSerializer, SessionEndSerializer
from classrooms.models import Classroom
from performance.models import Performance
from real_time.utils import send_to_session_group
import logging

logger = logging.getLogger(__name__)

class SessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        classroom_id = self.kwargs.get('classroom_pk')
        if classroom_id:
            return Session.objects.filter(classroom_id=classroom_id)
        return Session.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SessionCreateSerializer
        elif self.action == 'end':
            return SessionEndSerializer
        return SessionSerializer

    def create(self, request, *args, **kwargs):
        # Use SessionCreateSerializer for validation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Perform creation and get the instance
        instance = self.perform_create(serializer)
        # Use SessionSerializer for the response
        output_serializer = SessionSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        classroom = serializer.validated_data['classroom']
        # Check if user is the instructor of this classroom
        if classroom.instructor != self.request.user:
            raise serializers.ValidationError("Only the instructor can start a session")
        
        # End any existing active sessions for this classroom
        active_sessions = Session.objects.filter(
            classroom=classroom,
            is_active=True
        )
        
        for session in active_sessions:
            logger.info(f"Ending existing active session {session.id} before creating new one")
            session.end_session()
        
        # Create and return the new session instance
        return serializer.save(start_time=timezone.now())
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()
        # Create a performance record for the student
        Performance.objects.get_or_create(
            session=session,
            student=request.user,
            defaults={'attended': True, 'focus_score': 0.0}
        )
        logger.info(f"User {request.user.id} joined session {session.id}")
        return Response({'message': 'Joined session successfully'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        session = self.get_object()
        # Update the performance record
        try:
            performance = Performance.objects.get(session=session, student=request.user)
            performance.attended = False
            performance.save()
            logger.info(f"User {request.user.id} left session {session.id}")
            return Response({'message': 'Left session successfully'})
        except Performance.DoesNotExist:
            logger.warning(f"Performance record not found for user {request.user.id} in session {session.id}")
            return Response(
                {'error': 'Performance record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        session = self.get_object()
        if session.classroom.instructor != request.user:
            logger.warning(f"User {request.user.id} attempted to end session {session.id} without permission")
            return Response(
                {'error': 'Only the instructor can end the session'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # End session using WebSocket-aware method
        session.end_session()
        logger.info(f"Session {session.id} ended by instructor {request.user.id}")
        
        serializer = SessionEndSerializer(session)
        return Response(serializer.data)