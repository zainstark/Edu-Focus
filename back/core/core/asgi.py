import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from real_time.middleware import WebSocketJWTAuthMiddleware
from real_time import routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Apply WebSocketJWTAuthMiddleware to the WebSocket routing
websocket_application = WebSocketJWTAuthMiddleware(
    AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    )
)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": websocket_application,
})