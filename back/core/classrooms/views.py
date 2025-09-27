from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsInstructor
from .models import Classroom, Enrollment
from .serializers import ClassroomSerializer, ClassroomCreateSerializer, EnrollmentSerializer, JoinClassroomSerializer
from users.models import User

class ClassroomViewSet(viewsets.ModelViewSet):
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsInstructor]
        else:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'instructor':
            return Classroom.objects.filter(instructor=user)
        else:
            return Classroom.objects.filter(enrollments__student=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ClassroomCreateSerializer
        return ClassroomSerializer
    
    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)
    
    @action(detail=False, methods=['post'])
    def join(self, request):
        serializer = JoinClassroomSerializer(data=request.data)
        if serializer.is_valid():
            join_code = serializer.validated_data['join_code']
            try:
                classroom = Classroom.objects.get(join_code=join_code)
                enrollment, created = Enrollment.objects.get_or_create(
                    student=request.user,
                    classroom=classroom
                )
                if created:
                    return Response(
                        {'message': 'Successfully joined classroom'}, 
                        status=status.HTTP_201_CREATED
                    )
                else:
                    return Response(
                        {'message': 'Already enrolled in this classroom'}, 
                        status=status.HTTP_200_OK
                    )
            except Classroom.DoesNotExist:
                return Response(
                    {'error': 'Invalid join code'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)