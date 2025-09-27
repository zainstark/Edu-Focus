from collections import defaultdict
from channels.layers import get_channel_layer
from asgiref.sync import async_to_async

class ConnectionManager:
    """
    Manages WebSocket connections and participants
    """
    def __init__(self):
        self.active_connections = defaultdict(dict)
    
    async def connect(self, session_id, user_id, channel_name):
        """Add a connection to the manager"""
        self.active_connections[session_id][user_id] = channel_name
    
    async def disconnect(self, session_id, user_id):
        """Remove a connection from the manager"""
        if session_id in self.active_connections and user_id in self.active_connections[session_id]:
            del self.active_connections[session_id][user_id]
            
            # Clean up empty sessions
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def get_session_participants(self, session_id):
        """Get all participants in a session"""
        return list(self.active_connections.get(session_id, {}).keys())
    
    async def broadcast_to_session(self, session_id, message):
        """Broadcast a message to all participants in a session"""
        channel_layer = get_channel_layer()
        participants = self.active_connections.get(session_id, {})
        
        for user_id, channel_name in participants.items():
            await channel_layer.send(
                channel_name,
                {
                    'type': 'send_message',
                    'message': message
                }
            )

# Global connection manager instance
connection_manager = ConnectionManager()