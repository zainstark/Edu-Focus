// hooks/use-session-websocket.ts
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { SessionWebSocket, type Participant, type SessionStats } from "@/lib/websocket"
import { useAuth } from "@/lib/auth"

interface UseSessionWebSocketProps {
  sessionId: number | null
  onError?: (error: string) => void
  onFocusUpdate?: (userId: number, score: number) => void
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  user_role: string
}

interface SessionWebSocketState {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  participants: Participant[]
  sessionStats: SessionStats | null
  chatMessages: ChatMessage[]
  sessionStatus: "waiting" | "active" | "paused" | "ended"
  elapsedTime: number
  myFocusScore: number
}

export function useSessionWebSocket({ sessionId, onError, onFocusUpdate }: UseSessionWebSocketProps) {
  const { user } = useAuth()
  const wsRef = useRef<SessionWebSocket | null>(null)
  const onErrorRef = useRef(onError)
  const onFocusUpdateRef = useRef(onFocusUpdate)
  onErrorRef.current = onError
  onFocusUpdateRef.current = onFocusUpdate

  const [state, setState] = useState<SessionWebSocketState>({
    connected: false,
    connecting: false,
    reconnecting: false,
    participants: [],
    sessionStats: null,
    chatMessages: [],
    sessionStatus: "waiting",
    elapsedTime: 0,
    myFocusScore: 0,
  })

  const updateState = useCallback((updates: Partial<SessionWebSocketState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const connect = useCallback(async (retryCount = 0): Promise<void> => {
    const maxRetries = 3
    
    if (!sessionId || !Number.isInteger(sessionId) || sessionId <= 0) {
      console.warn("useSessionWebSocket: invalid sessionId:", sessionId)
      onErrorRef.current?.("Invalid session ID")
      return
    }

    if (wsRef.current && wsRef.current.isConnected()) return

    updateState({ connecting: true, reconnecting: retryCount > 0 })

    try {
      const ws = new SessionWebSocket(sessionId)
      wsRef.current = ws

      const wsPath = `/ws/session/${sessionId}/`

      // Connection events
      ws.onMessage("connection.established", (data: any) => {
        console.log("WebSocket connection established", data)
        updateState({ 
          connected: true, 
          connecting: false, 
          reconnecting: false 
        })
      })

      ws.onMessage("reconnecting", () => {
        updateState({ reconnecting: true, connected: false })
      })

      ws.onMessage("reconnected", () => {
        updateState({ reconnecting: false, connected: true })
      })

      ws.onMessage("reconnect_failed", (data: any) => {
        updateState({ reconnecting: false, connected: false })
        onErrorRef.current?.("Failed to reconnect to session")
      })

      // User join/leave events
      const handleUserJoined = (data: any) => {
        try {
          const newParticipant: Participant = {
            id: Number(data.user_id),
            name: data.user_name || "Unknown",
            role: data.user_role || "student",
            focus_score: 0,
            is_active: true,
            joined_at: new Date().toISOString(),
            last_focus_update: new Date().toISOString(),
          }

          setState(prevState => ({
            ...prevState,
            participants: prevState.participants.some((p) => p.id === newParticipant.id)
              ? prevState.participants.map(p => 
                  p.id === newParticipant.id ? { ...p, is_active: true } : p
                )
              : [...prevState.participants, newParticipant],
          }))
        } catch (e) {
          console.error("handleUserJoined error", e)
        }
      }

      const handleUserLeft = (data: any) => {
        try {
          setState(prevState => ({
            ...prevState,
            participants: prevState.participants.map((p) =>
              p.id === Number(data.user_id)
                ? { ...p, is_active: false }
                : p
            ),
          }))
        } catch (e) {
          console.error("handleUserLeft error", e)
        }
      }

      // Focus update events
      const handleFocusUpdate = (data: any) => {
        try {
          const focus = data.focus_score
          const userId = Number(data.user_id)
          const userName = data.user_name || "Unknown"
          const userRole = data.user_role || "student"

          if (userId && userId === user?.id) {
            updateState({ myFocusScore: focus })
            onFocusUpdateRef.current?.(userId, focus)
          }

          setState(prevState => {
            const existingParticipant = prevState.participants.find(p => p.id === userId)
            
            if (existingParticipant) {
              return {
                ...prevState,
                participants: prevState.participants.map(p =>
                  p.id === userId
                    ? {
                        ...p,
                        focus_score: focus,
                        last_focus_update: new Date().toISOString(),
                        is_active: true,
                      }
                    : p
                )
              }
            } else {
              const newParticipant: Participant = {
                id: userId,
                name: userName,
                role: userRole,
                focus_score: focus,
                is_active: true,
                joined_at: new Date().toISOString(),
                last_focus_update: new Date().toISOString(),
              }
              
              return {
                ...prevState,
                participants: [...prevState.participants, newParticipant]
              }
            }
          })

        } catch (e) {
          console.error("handleFocusUpdate error", e)
        }
      }

      // Session control events
      const handleSessionControl = (data: any) => {
        console.log("Session control received:", data)
        const controlType = data.control_type
        
        let newStatus: "waiting" | "active" | "paused" | "ended" = state.sessionStatus
        
        switch (controlType) {
          case "start":
          case "resume":
            newStatus = "active"
            break
          case "pause":
            newStatus = "paused"
            break
          case "end":
            newStatus = "ended"
            break
          default:
            console.warn("Unknown control type:", controlType)
            return
        }
        
        updateState({ sessionStatus: newStatus })
        console.log(`Session status updated to: ${newStatus}`)
      }

      // Session ended handler
      const handleSessionEnded = (data: any) => {
        console.log("Session ended message received:", data)
        updateState({ 
          sessionStatus: "ended",
          connected: false
        })
      }

      // Timer updates
      const handleTimerUpdate = (data: any) => {
        const elapsed = data.elapsed_time
        if (elapsed !== undefined) {
          updateState({ elapsedTime: Number(elapsed) })
        }
      }

      // Chat messages
      const handleChatMessage = (data: any) => {
        try {
          const message = {
            id: `${data.user_id}-${Date.now()}-${Math.random()}`,
            user: data.user_name || "Unknown",
            message: data.message,
            timestamp: new Date(data.timestamp || Date.now()),
            user_role: data.user_role || "student"
          }
          
          setState(prevState => ({
            ...prevState,
            chatMessages: [...prevState.chatMessages.slice(-49), message]
          }))
        } catch (e) {
          console.error("handleChatMessage error", e)
        }
      }

      // Session stats
      const handleSessionStats = (data: any) => {
        try {
          setState(prevState => ({
            ...prevState,
            sessionStats: data.stats,
          }))
        } catch (e) {
          console.error("handleSessionStats error", e)
        }
      }

      // Register all handlers
      ws.onMessage("session.joined", handleUserJoined)
      ws.onMessage("session.left", handleUserLeft)
      ws.onMessage("focus.update", handleFocusUpdate)
      ws.onMessage("session.control", handleSessionControl)
      ws.onMessage("session.ended", handleSessionEnded)
      ws.onMessage("timer.update", handleTimerUpdate)
      ws.onMessage("chat.message", handleChatMessage)
      ws.onMessage("session.stats", handleSessionStats)

      ws.onMessage("pong", () => {})

      ws.onMessage("error", (data: any) => {
        console.error("WebSocket error:", data)
        onErrorRef.current?.(data?.message || "WebSocket error")
      })

      await ws.connect(wsPath)
      
    } catch (error: any) {
      console.error(`WebSocket connection attempt ${retryCount + 1} failed:`, error)
      
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        console.log(`Retrying WebSocket connection in ${delay}ms...`)
        
        setTimeout(() => {
          connect(retryCount + 1)
        }, delay)
      } else {
        updateState({ connecting: false, reconnecting: false })
        onErrorRef.current?.(error?.message || "Failed to connect to session after multiple attempts")
      }
    }
  }, [sessionId, user?.id, updateState, state.sessionStatus])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect()
      wsRef.current = null
    }
    updateState({
      connected: false,
      connecting: false,
      reconnecting: false,
    })
  }, [updateState])

  const sendFocusUpdate = useCallback((focusScore: number) => {
    if (wsRef.current && wsRef.current.isConnected()) {
      wsRef.current.sendFocusUpdate(focusScore)
    }
  }, [])

  const sendChatMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.isConnected()) {
      wsRef.current.sendChatMessage(message)
    }
  }, [])

  const sendSessionControl = useCallback((controlType: "start" | "pause" | "resume" | "end") => {
    if (wsRef.current && wsRef.current.isConnected()) {
      wsRef.current.sendSessionControl(controlType)
    }
  }, [])

  const sendLeaveSession = useCallback(() => {
    if (wsRef.current && wsRef.current.isConnected()) {
      wsRef.current.sendLeaveSession()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
    sendFocusUpdate,
    sendChatMessage,
    sendSessionControl,
    sendLeaveSession,
    connectionState: wsRef.current?.getConnectionState() || "closed",
    queuedMessages: wsRef.current?.getQueuedMessageCount() || 0,
  }
}