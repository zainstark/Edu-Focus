# core/real_time/consumers.py
import json
import logging
import urllib.parse
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from session.models import Session
from performance.models import Performance
from classrooms.models import Enrollment
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db.models import Avg, Count, Q
from datetime import timedelta

logger = logging.getLogger(__name__)
User = get_user_model()

class SessionConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = None
        self.session_group_name = None
        self.user = None
        self.user_role = None
        self.timer_task = None
        self.running = True
        self.connected_users = set()

    async def connect(self):
        try:
            self.session_id = self.scope['url_route']['kwargs']['session_id']
            self.session_group_name = f'session_{self.session_id}'
            logger.info(f'Connecting to session {self.session_id}')

            # Authentication
            self.user = self.scope.get('user')
            user_is_auth = getattr(self.user, "is_authenticated", False)
            
            if not user_is_auth:
                qs = self.scope.get('query_string', b'').decode()
                params = urllib.parse.parse_qs(qs)
                token = params.get('token', [None])[0]
                
                if token:
                    authenticated = await self.authenticate_user(token)
                    if authenticated:
                        self.user = authenticated
                    else:
                        logger.error("Token authentication failed")
                else:
                    logger.warning("No token found in query string")

            # Final authentication check
            if not getattr(self.user, "is_authenticated", False):
                logger.error("WebSocket connection rejected: unauthenticated user")
                await self.close(code=4001)
                return

            # Check session access
            has_access = await self.check_session_access()
            if not has_access:
                logger.error(f'User {getattr(self.user, "id", None)} does not have access to session {self.session_id}')
                await self.close(code=4003)
                return

            # Join session group
            await self.channel_layer.group_add(self.session_group_name, self.channel_name)
            await self.accept()

            # Store user connection
            user_id = getattr(self.user, 'id', None)
            if user_id:
                self.connected_users.add(user_id)

            # Send connection confirmation
            try:
                payload = {
                    'type': 'connection.established',
                    'message': 'WebSocket connection established successfully',
                    'session_id': int(self.session_id),
                    'user_id': user_id,
                    'user_role': getattr(self.user, 'role', None),
                }
                await self.send(text_data=json.dumps(payload))
            except Exception as e:
                logger.exception("Failed while sending connection confirmation: %s", e)
                await self.close(code=4002)
                return

            # Start background timer task
            await self.start_session_timer()

            # Notify join and update attendance
            user_role = getattr(self.user, 'role', None)
            if user_role == 'student':
                await self.update_attendance(True)
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session.joined',
                        'user_id': getattr(self.user, 'id', None),
                        'user_name': getattr(self.user, 'full_name', None),
                        'user_role': user_role,
                        'timestamp': await self.get_current_time()
                    }
                )

            # Send initial stats
            await self.broadcast_session_stats()

            logger.info(f"User {getattr(self.user, 'id', 'unknown')} connected to session {self.session_id}")

        except Exception as e:
            logger.exception(f"Error in WebSocket connection: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            self.running = False
            
            # Remove user from connected set
            user_id = getattr(self.user, 'id', None)
            if user_id and user_id in self.connected_users:
                self.connected_users.remove(user_id)
            
            # Cancel timer task
            if self.timer_task and not self.timer_task.done():
                self.timer_task.cancel()
            
            # Leave session group
            if self.session_group_name:
                await self.channel_layer.group_discard(
                    self.session_group_name,
                    self.channel_name
                )
            
            # Notify group about user leaving (only for students)
            if self.user and self.user.role == 'student':
                await self.update_attendance(False)
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session.left',
                        'user_id': self.user.id,
                        'user_name': self.user.full_name,
                        'user_role': self.user.role,
                        'timestamp': await self.get_current_time()
                    }
                )
                
            logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from session {self.session_id}")
            
        except Exception as e:
            logger.exception(f"Error in WebSocket disconnection: {str(e)}")

    async def broadcast_message(self, event):
        """
        Handle broadcast messages from the channel layer.
        This was referenced in the Session model but missing in the consumer.
        """
        try:
            # Extract the inner message and send it directly to the client
            message_text = event.get("message", "")
            if message_text:
                await self.send(text_data=message_text)
            else:
                logger.warning("broadcast_message received without message content")
        except Exception as e:
            logger.exception(f"Error in broadcast_message: {e}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid JSON format'}))
            return

        message_type = data.get('type')
        if not message_type:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Missing message type'}))
            return

        # Better message type normalization
        normalized = message_type.replace('.', '_').lower()

        # Handle ping first
        if normalized == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong', 'ts': await self.get_current_time()}))
            return

        # Route to appropriate handlers
        handler_map = {
            'focus_update': self.handle_focus_update,
            'timer_update': self.handle_timer_update,
            'session_control': self.handle_session_control,
            'chat_message': self.handle_chat_message,
            'request_session_stats': self.broadcast_session_stats,
        }

        handler = handler_map.get(normalized)
        if handler:
            await handler(data)
        else:
            logger.warning(f"Unknown message type: {message_type} (normalized: {normalized})")
            await self.send(text_data=json.dumps({'type': 'error', 'message': f'Unknown message type: {message_type}'}))

    async def handle_focus_update(self, data):
        """Handle focus score updates - ONLY from students"""
        # CRITICAL: Only students can submit focus scores
        if not self.user or self.user.role != 'student':
            error_msg = 'Only students can submit focus scores'
            logger.warning(f"Focus update rejected: User {getattr(self.user, 'id', 'unknown')} is {getattr(self.user, 'role', 'unknown')}")
            await self.send(text_data=json.dumps({'type': 'error', 'message': error_msg}))
            return

        focus_score = data.get('focus_score')
        if focus_score is None:
            focus_score = data.get('focus')

        try:
            focus_score = float(focus_score)
            if not (0.0 <= focus_score <= 1.0):
                focus_score = max(0.0, min(1.0, focus_score))
        except (TypeError, ValueError):
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid focus score'}))
            return

        # Update DB
        success = await self.update_focus_score(focus_score)
        if not success:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Failed to update focus score'}))
            return

        # BROADCAST TO ALL PARTICIPANTS (including instructor)
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'focus.update',  # This triggers the focus_update method below
                'user_id': self.user.id,
                'user_name': self.user.full_name,
                'user_role': self.user.role,
                'focus_score': focus_score,
                'timestamp': await self.get_current_time()
            }
        )

        # Also broadcast updated stats
        await self.broadcast_session_stats()

        await self.send(text_data=json.dumps({'type': 'focus.update.ack', 'message': 'Focus score updated successfully'}))

    async def handle_timer_update(self, data):
        """Handle timer updates from instructor"""
        if not self.user or self.user.role != 'instructor':
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Only instructors can update timer'}))
            return
            
        elapsed_time = data.get('elapsed_time')
        try:
            elapsed_time = float(elapsed_time)
        except (TypeError, ValueError):
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid elapsed time'}))
            return

        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'timer.update',
                'elapsed_time': elapsed_time,
                'sent_by': self.user.id,
                'timestamp': await self.get_current_time()
            }
        )

    async def handle_session_control(self, data):
        """Handle session control commands from instructor"""
        if not self.user or self.user.role != 'instructor':
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Only instructors can control sessions'}))
            return
            
        control_type = data.get('control_type')
        if control_type not in ['start', 'pause', 'resume', 'end']:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid control type'}))
            return
            
        logger.info(f"Session control: {control_type} by instructor {self.user.id}")
        
        if control_type == 'end':
            success = await self.end_session()
            if not success:
                await self.send(text_data=json.dumps({'type': 'error', 'message': 'Failed to end session'}))
                return
            else:
                # Stop the timer loop when session ends
                self.running = False
                if self.timer_task and not self.timer_task.done():
                    self.timer_task.cancel()

        # Broadcast control message to ALL participants
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'session.control',
                'control_type': control_type,
                'sent_by': self.user.id,
                'sent_by_name': self.user.full_name,
                'timestamp': await self.get_current_time(),
                'message': f'Session {control_type}ed by instructor'
            }
        )

        # Also broadcast session ended separately for reliable handling
        if control_type == 'end':
            await self.channel_layer.group_send(
                self.session_group_name,
                {
                    'type': 'session.ended',
                    'message': 'Session has ended',
                    'end_time': await self.get_current_time(),
                    'sent_by': self.user.id
                }
            )

    async def handle_chat_message(self, data):
        """Handle chat messages from all participants"""
        message = data.get('message')
        if not message or not isinstance(message, str):
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Invalid chat message'}))
            return
        
        # Validate message length
        if len(message.strip()) == 0:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Message cannot be empty'}))
            return
            
        if len(message) > 1000:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Message too long'}))
            return

        # Broadcast to all participants
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'chat.message',
                'user_id': self.user.id,
                'user_name': self.user.full_name,
                'user_role': self.user.role,
                'message': message.strip(),
                'timestamp': await self.get_current_time()
            }
        )

    # Group event handlers
    async def session_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session.joined',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_role': event['user_role'],
            'timestamp': event['timestamp']
        }))

    async def session_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session.left',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_role': event['user_role'],
            'timestamp': event['timestamp']
        }))

    async def focus_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'focus.update',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_role': event['user_role'],
            'focus_score': event['focus_score'],
            'timestamp': event['timestamp']
        }))

    async def timer_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'timer.update',
            'elapsed_time': event['elapsed_time'],
            'sent_by': event['sent_by'],
            'timestamp': event['timestamp']
        }))

    async def session_control(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session.control',
            'control_type': event['control_type'],
            'sent_by': event['sent_by'],
            'sent_by_name': event.get('sent_by_name', 'Instructor'),
            'timestamp': event['timestamp'],
            'message': event.get('message', '')
        }))

    async def session_ended(self, event):
        """Handle session ended event"""
        await self.send(text_data=json.dumps({
            'type': 'session.ended',
            'message': event.get('message', 'Session has ended'),
            'end_time': event.get('end_time'),
            'sent_by': event.get('sent_by')
        }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_role': event['user_role'],
            'message': event['message'],
            'timestamp': event['timestamp']
        }))

    async def session_stats(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session.stats',
            'stats': event['stats'],
            'timestamp': event['timestamp']
        }))

    # Timer and stats methods
    async def start_session_timer(self):
        """Start background timer task"""
        self.timer_task = asyncio.create_task(self.update_timer_loop())

    async def update_timer_loop(self):
        """Continuously update and broadcast session timer"""
        try:
            session = await self.get_session()
            if not session or not session.is_active:
                return
                
            while self.running and session.is_active:
                elapsed = await self.calculate_elapsed_time(session)
                
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'timer.update',
                        'elapsed_time': elapsed,
                        'sent_by': None,
                        'timestamp': await self.get_current_time()
                    }
                )
                
                await asyncio.sleep(1)
                session = await self.get_session()
                
        except asyncio.CancelledError:
            logger.info("Timer task cancelled")
        except Exception as e:
            logger.exception(f"Timer loop error: {e}")

    async def broadcast_session_stats(self):
        """Calculate and broadcast session statistics"""
        stats = await self.calculate_session_stats()
        
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'session.stats',
                'stats': stats,
                'timestamp': await self.get_current_time()
            }
        )

    @database_sync_to_async
    def calculate_session_stats(self):
        """Calculate comprehensive session statistics - STUDENTS ONLY with proper filtering"""
        try:
            session = Session.objects.get(id=self.session_id)
            
            # Get all student performances for this session
            performances = Performance.objects.filter(
                session=session, 
                attended=True,
                student__role='student'  # CRITICAL: Only students
            )
            
            # Get recent performances (last 2 minutes)
            recent_threshold = timezone.now() - timedelta(minutes=2)
            recent_performances = performances.filter(timestamp__gte=recent_threshold)
            
            # Use conditional aggregation for a single, efficient query
            stats_agg = recent_performances.aggregate(
                avg_focus=Avg('focus_score'),
                high_focus=Count('pk', filter=Q(focus_score__gte=0.8)),
                medium_focus=Count('pk', filter=Q(focus_score__gte=0.6, focus_score__lt=0.8)),
                low_focus=Count('pk', filter=Q(focus_score__lt=0.6)),
                active_students=Count('student', distinct=True)
            )
            avg_focus = stats_agg['avg_focus'] or 0
            
            # Count only students enrolled in the classroom
            total_students = Enrollment.objects.filter(
                classroom=session.classroom, 
                student__role='student'
            ).count()

            # Session duration
            if session.end_time:
                session_duration = (session.end_time - session.start_time).total_seconds()
            else:
                session_duration = (timezone.now() - session.start_time).total_seconds()
            
            stats = {
                'total_participants': total_students,
                'active_participants': stats_agg['active_students'],
                'average_focus_score': round(avg_focus, 3),
                'session_duration': session_duration,
                'focus_distribution': {
                    'high': stats_agg['high_focus'],
                    'medium': stats_agg['medium_focus'],
                    'low': stats_agg['low_focus']
                }
            }
            
            logger.debug(f"Session stats calculated: {stats}")
            return stats
            
        except Exception as e:
            logger.exception(f"Error calculating session stats: {e}")
            return {}

    # Database operations
    @database_sync_to_async
    def authenticate_user(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, User.DoesNotExist) as e:
            logger.debug(f"Token auth error: {e}")
            return None

    @database_sync_to_async
    def check_session_access(self):
        try:
            session = Session.objects.get(id=self.session_id)
            if self.user.role == 'instructor':
                return session.classroom.instructor == self.user
            else:
                return Enrollment.objects.filter(
                    classroom=session.classroom, 
                    student=self.user
                ).exists()
        except Session.DoesNotExist:
            logger.error(f'Session {self.session_id} does not exist')
            return False

    @database_sync_to_async
    def update_attendance(self, attended):
        try:
            session = Session.objects.get(id=self.session_id)
            performance, created = Performance.objects.get_or_create(
                session=session,
                student=self.user,
                defaults={
                    'attended': attended,
                    'focus_score': 0.0,
                }
            )
            if not created:
                performance.attended = attended
                performance.save()
            return True
        except Exception as e:
            logger.exception(f"update_attendance error: {e}")
            return False

    @database_sync_to_async
    def update_focus_score(self, focus_score):
        try:
            session = Session.objects.get(id=self.session_id)
            performance, created = Performance.objects.get_or_create(
                session=session,
                student=self.user,
                defaults={'focus_score': focus_score, 'attended': True}
            )
            if not created:
                performance.focus_score = focus_score
                performance.timestamp = timezone.now()
                performance.save()
            return True
        except Exception as e:
            logger.exception(f"update_focus_score error: {e}")
            return False

    @database_sync_to_async
    def end_session(self):
        """End the session and update all records"""
        try:
            session = Session.objects.get(id=self.session_id)
            
            # Only end if not already ended
            if not session.is_active:
                return False

            session.is_active = False
            session.end_time = timezone.now()
            session.save()
            
            # Update all performance records to mark as not attended
            # This ensures students who left early are properly recorded
            Performance.objects.filter(session=session).update(attended=False)
            
            logger.info(f"Session {self.session_id} ended at {session.end_time}")
            return True
            
        except Exception as e:
            logger.exception(f"end_session error: {e}")
            return False

    @database_sync_to_async
    def get_session(self):
        try:
            return Session.objects.get(id=self.session_id)
        except Session.DoesNotExist:
            return None

    @database_sync_to_async
    def calculate_elapsed_time(self, session):
        if session.end_time:
            return (session.end_time - session.start_time).total_seconds()
        else:
            return (timezone.now() - session.start_time).total_seconds()

    @database_sync_to_async
    def get_current_time(self):
        return timezone.now().isoformat()