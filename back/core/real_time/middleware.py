from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()

class WebSocketJWTAuthMiddleware:
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Extract token from query string
        query_string = scope.get('query_string', b'').decode()
        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break

        if token:
            try:
                user = await self.get_user_from_token(token)
                if user:
                    scope['user'] = user
                else:
                    # Close connection if user not found
                    await send({
                        "type": "websocket.close",
                        "code": 4001
                    })
                    return
            except (InvalidToken, TokenError):
                # Close connection if token is invalid
                await send({
                    "type": "websocket.close",
                    "code": 4002
                })
                return
        else:
            # No token provided → close
            await send({
                "type": "websocket.close",
                "code": 4003
            })
            return

        return await self.app(scope, receive, send)

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, User.DoesNotExist):
            return None