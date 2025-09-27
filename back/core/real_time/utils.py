from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

async def send_to_session_group(session_id, message):
    """
    Send a message to a specific session group
    """
    channel_layer = get_channel_layer()
    group_name = f'session_{session_id}'
    
    await channel_layer.group_send(
        group_name,
        {
            'type': 'broadcast_message',
            'message': message
        }
    )

async def get_session_participants(session_id):
    """
    Get list of participants in a session (for debugging/monitoring)
    """
    channel_layer = get_channel_layer()
    group_name = f'session_{session_id}'
    
    # This is a simplified implementation - in production you might want
    # to track participants in a more robust way (e.g., Redis)
    return await channel_layer.group_send(group_name, {
        'type': 'list_participants'
    })