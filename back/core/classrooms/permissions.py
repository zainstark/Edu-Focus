from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Enrollment

class IsInstructor(BasePermission):
    """
    Allows access only to instructor users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'instructor'

class IsStudent(BasePermission):
    """
    Allows access only to student users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'student'

class IsEnrolled(BasePermission):
    """
    Allows access only to users enrolled in the classroom.
    Instructors have full access. Enrolled students have read-only access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        classroom_id = view.kwargs.get('classroom_id') or view.kwargs.get('pk')
        if not classroom_id:
            return False

        # Instructors have full access to their classrooms
        if request.user.role == 'instructor':
            return request.user.taught_classrooms.filter(pk=classroom_id).exists()

        # Students must be enrolled to have any access
        if request.user.role == 'student':
            is_enrolled = Enrollment.objects.filter(
                classroom_id=classroom_id,
                student=request.user
            ).exists()

            # Grant read-only access for enrolled students
            if is_enrolled and request.method in SAFE_METHODS:
                return True

        return False