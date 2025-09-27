class WebSocketError(Exception):
    """Base exception for WebSocket errors"""
    pass

class AuthenticationError(WebSocketError):
    """Authentication failed"""
    pass

class AuthorizationError(WebSocketError):
    """User not authorized for this action"""
    pass

class InvalidMessageError(WebSocketError):
    """Invalid message format or content"""
    pass

class SessionNotFoundError(WebSocketError):
    """Session not found"""
    pass