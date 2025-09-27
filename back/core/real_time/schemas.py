"""
WebSocket message schemas for EduFocus
"""

# Message types
MESSAGE_TYPES = {
    'CONNECTION_ESTABLISHED': 'connection_established',
    'FOCUS_UPDATE': 'focus_update',
    'TIMER_UPDATE': 'timer_update',
    'SESSION_CONTROL': 'session_control',
    'CHAT_MESSAGE': 'chat_message',
    'USER_JOINED': 'user_joined',
    'USER_LEFT': 'user_left',
    'ERROR': 'error'
}

# Focus update schema
FOCUS_UPDATE_SCHEMA = {
    'type': 'object',
    'properties': {
        'type': {'const': MESSAGE_TYPES['FOCUS_UPDATE']},
        'focus_score': {'type': 'number', 'minimum': 0, 'maximum': 1}
    },
    'required': ['type', 'focus_score']
}

# Timer update schema
TIMER_UPDATE_SCHEMA = {
    'type': 'object',
    'properties': {
        'type': {'const': MESSAGE_TYPES['TIMER_UPDATE']},
        'elapsed_time': {'type': 'number', 'minimum': 0}
    },
    'required': ['type', 'elapsed_time']
}

# Session control schema
SESSION_CONTROL_SCHEMA = {
    'type': 'object',
    'properties': {
        'type': {'const': MESSAGE_TYPES['SESSION_CONTROL']},
        'control_type': {'enum': ['start', 'pause', 'resume', 'end']}
    },
    'required': ['type', 'control_type']
}

# Chat message schema
CHAT_MESSAGE_SCHEMA = {
    'type': 'object',
    'properties': {
        'type': {'const': MESSAGE_TYPES['CHAT_MESSAGE']},
        'message': {'type': 'string', 'minLength': 1, 'maxLength': 500}
    },
    'required': ['type', 'message']
}