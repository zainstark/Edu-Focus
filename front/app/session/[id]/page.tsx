"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { api, type Session } from "@/lib/api"
import { MediaPipeFocusAnalyzer, type FocusMetrics } from "@/lib/focus-analysis"
import { useSessionWebSocket } from "@/hooks/use-session-websocket"
import { ConnectionStatus } from "@/components/session/connection-status"
import { RealTimeStats } from "@/components/session/real-time-stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Play, Pause, Square, Users, MessageCircle, Camera, CameraOff, Send, Clock, Eye, ArrowLeft, RefreshCw } from "lucide-react"

interface ParticipantLocal {
  id: number
  name: string
  focus_score: number
  is_active: boolean
  role: string
  last_focus_update?: string | null
}

interface ConnectionDebugInfoProps {
  connected: boolean;
  connecting: boolean;
  sessionId: number;
  joined: boolean;
  sessionStatus: string;
}


export default function LiveSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const routeSessionId = Number(params?.id)
  const sessionId = Number(routeSessionId)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const analyzerRef = useRef<MediaPipeFocusAnalyzer | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const lastSentRef = useRef<number>(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectedRef = useRef<boolean>(false)
  const sessionEndedRef = useRef<boolean>(false)
  const disconnectRef = useRef<() => void>(() => {})
  const mountedRef = useRef<boolean>(true)

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [myFocusScore, setMyFocusScore] = useState<number>(0)
  const [joined, setJoined] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [localElapsedTime, setLocalElapsedTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [focusHistory, setFocusHistory] = useState<{ts: number, avg: number}[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [analyzerInitialized, setAnalyzerInitialized] = useState(false)

  // Validate session id early
  useEffect(() => {
    if (!routeSessionId || Number.isNaN(routeSessionId) || routeSessionId <= 0) {
      setError("Invalid session ID")
      const dashboardPath = user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
      setTimeout(() => router.push(dashboardPath), 1500)
    }
  }, [routeSessionId, router, user])

  // Session initialization with retry logic
  const initializeSession = useCallback(async (attempt = 0) => {
    if (!mountedRef.current) return
    
    const maxRetries = 3
    setLoading(true)
    setError("")

    try {
      console.log(`Session initialization attempt ${attempt + 1} for session ${sessionId}`)
      
      // Step 1: Get session data
      const sessionData = await api.getSession(sessionId)
      if (!mountedRef.current) return
      setSession(sessionData)

      // Step 2: Join session via API
      await api.joinSession(sessionId)
      if (!mountedRef.current) return
      setJoined(true)
      
      // Step 3: Set up elapsed time from session start
      if (sessionData.start_time) {
        const startTime = new Date(sessionData.start_time).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        setLocalElapsedTime(elapsedSeconds)
      }

      setRetryCount(0)
      
    } catch (err: any) {
      console.error(`Session initialization attempt ${attempt + 1} failed:`, err)
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        console.log(`Retrying session initialization in ${delay}ms...`)
        
        setTimeout(() => {
          if (mountedRef.current) {
            initializeSession(attempt + 1)
          }
        }, delay)
      } else {
        if (mountedRef.current) {
          setError(err?.message || "Failed to load session after multiple attempts")
          setRetryCount(attempt + 1)
          
          setTimeout(() => {
            if (mountedRef.current && !joined) {
              const dashboardPath = user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
              router.push(dashboardPath)
            }
          }, 5000)
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [sessionId, router, user?.role, joined])

  // Fetch session and join via API
  useEffect(() => {
    mountedRef.current = true
    
    if (sessionId && !Number.isNaN(sessionId) && sessionId > 0) {
      initializeSession(0)
    }

    return () => {
      mountedRef.current = false
    }
  }, [sessionId, initializeSession])

  // Initialize MediaPipe analyzer when component mounts
  useEffect(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new MediaPipeFocusAnalyzer()
      setAnalyzerInitialized(true)
    }

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stopAnalysis()
        analyzerRef.current = null
        setAnalyzerInitialized(false)
      }
    }
  }, [])

  // WebSocket hook
  const {
    connected,
    connecting,
    reconnecting,
    participants,
    sessionStats,
    chatMessages,
    sessionStatus,
    elapsedTime,
    sendFocusUpdate,
    sendChatMessage,
    sendSessionControl,
    sendLeaveSession,
    connectionState,
    queuedMessages,
    connect,
    disconnect,
  } = useSessionWebSocket({
    sessionId: joined && session ? session.id : NaN,
    onError: useCallback((msg: string) => {
      if (mountedRef.current) {
        setError(prev => prev ? `${prev} | ${msg}` : msg)
      }
    }, []),
    onFocusUpdate: useCallback((userId: number, score: number) => {
      if (mountedRef.current && userId === user?.id) {
        setFocusHistory(prev => [...prev.slice(-99), { ts: Date.now(), avg: score }])
      }
    }, [user?.id]),
  })

  // Update refs when state changes
  useEffect(() => {
    connectedRef.current = connected
    disconnectRef.current = disconnect
  }, [connected, disconnect])

  useEffect(() => {
    sessionEndedRef.current = sessionEnded
  }, [sessionEnded])

  // Connect WebSocket after successful API join
  useEffect(() => {
    if (joined && session && session.id > 0 && !connected && !connecting) {
      console.log("Attempting WebSocket connection for session:", session.id)
      
      const connectWebSocket = async () => {
        try {
          await connect()
        } catch (err) {
          console.error("WebSocket connection failed:", err)
          if (mountedRef.current) {
            setError("Failed to connect to live session. Retrying...")
            setTimeout(() => {
              if (mountedRef.current && joined && !connected) {
                connectWebSocket()
              }
            }, 2000)
          }
        }
      }
      
      connectWebSocket()
    }
  }, [joined, session, connected, connecting, connect])

  // Sync elapsed time with WebSocket updates
  useEffect(() => {
    if (elapsedTime > 0) {
      setLocalElapsedTime(elapsedTime)
    }
  }, [elapsedTime])

  // Handle timer based on session status
  useEffect(() => {
    if (sessionStatus === 'active' && !isTimerRunning) {
      setIsTimerRunning(true)
    } else if ((sessionStatus === 'paused' || sessionStatus === 'waiting') && isTimerRunning) {
      setIsTimerRunning(false)
    } else if (sessionStatus === 'ended') {
      setIsTimerRunning(false)
      setSessionEnded(true)
    }
  }, [sessionStatus, isTimerRunning])
  
  // =========================================================================
  // MOVED BLOCK - START
  // This entire block of camera/analyzer functions has been moved here
  // to ensure they are declared before any useEffect hooks try to use them.
  // =========================================================================

  const stopCameraAndAnalysis = useCallback(() => {
    if (analyzerRef.current) {
      try {
        analyzerRef.current.stopAnalysis()
      } catch {}
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      } catch {}
    }

    setCameraEnabled(false)
    setAnalyzing(false)
  }, [])
  
  const startAnalysis = useCallback(async () => {
    const videoEl = videoRef.current
    if (!videoEl || !analyzerRef.current) {
      setError("Video element or analyzer not available")
      return
    }

    setAnalyzing(true)

    try {
      await analyzerRef.current.startAnalysis(videoEl, (metrics: FocusMetrics) => {
        const score = Math.max(0, Math.min(1, metrics.overallFocus))
        setMyFocusScore(score)

        const now = Date.now()
        const last = lastSentRef.current || 0
        if (connectedRef.current && now - last > 500) { // Throttle to 2 updates per second
          try {
            sendFocusUpdate(score)
            lastSentRef.current = now
          } catch (err) {
            console.error("sendFocusUpdate error:", err)
          }
        }
      }, 100) // 100ms interval for smooth updates
    } catch (err) {
      console.error("MediaPipe analyzer start error:", err)
      setError("Failed to start focus analysis. Please refresh and try again.")
      setAnalyzing(false)
    }
  }, [connected, sendFocusUpdate])

  const enableCamera = useCallback(async () => {
    if (!videoRef.current) {
      setError("Video element not available")
      return
    }

    if (cameraEnabled) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      cameraStreamRef.current = stream
      videoRef.current.srcObject = stream

      await videoRef.current.play()

      setCameraEnabled(true)
      startAnalysis()
    } catch (err) {
      console.error("Camera error:", err)
      setError("Failed to access camera. Check permissions.")
    }
  }, [cameraEnabled, startAnalysis])

  const disableCamera = useCallback(() => {
    stopCameraAndAnalysis()
    setCameraEnabled(false)
  }, [stopCameraAndAnalysis])

  // =========================================================================
  // MOVED BLOCK - END
  // =========================================================================


  // Handle session end for all users
  useEffect(() => {
    if (sessionStatus === 'ended' && !sessionEndedRef.current) {
      sessionEndedRef.current = true
      setSessionEnded(true)
      
      stopCameraAndAnalysis()
      disconnect()
      
      setTimeout(() => {
        if (mountedRef.current) {
          const role = user?.role || 'student'
          router.push(`/${role}/dashboard`)
        }
      }, 2000)
    }
  }, [sessionStatus, user, router, disconnect, stopCameraAndAnalysis])

  // Update elapsed time when timer is running
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setLocalElapsedTime(prev => prev + 1)
      }, 1000)
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isTimerRunning])

  // Request session stats periodically
  useEffect(() => {
    if (connected && sessionId) {
      const statsInterval = setInterval(() => {
        // This will trigger stats update via WebSocket
        if (connected) {
          // Stats are automatically pushed by the server on focus updates
          // No need to manually request
        }
      }, 3000)
      
      return () => clearInterval(statsInterval)
    }
  }, [connected, sessionId])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      stopCameraAndAnalysis()
      
      if (connectedRef.current && !sessionEndedRef.current) {
        try {
          sendLeaveSession()
        } catch {}
      }
      disconnect()
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [sendLeaveSession, disconnect, stopCameraAndAnalysis])

  // Session control handlers (for instructor)
  const handleSessionControl = useCallback(async (action: "start" | "pause" | "resume" | "end") => {
    try {
      if (action === "end" && session) {
        setError("Ending session...")

        try {
          const updatedSession = await api.endSession(session.id)
          setSession(updatedSession)
          
          sendSessionControl(action)
          stopCameraAndAnalysis()
          disconnect()
          setSessionEnded(true)
          
          setTimeout(() => {
            const role = user?.role || 'student'
            router.push(`/${role}/dashboard`)
          }, 2000)
        } catch (err) {
          console.warn("api.endSession failed", err)
          sendSessionControl(action)
        }
      } else {
        sendSessionControl(action)
        
        if (action === "pause") {
          setIsTimerRunning(false)
        } else if (action === "resume" || action === "start") {
          setIsTimerRunning(true)
        }
      }
    } catch (err) {
      console.error("Session control error:", err)
      setError("Failed to send session control")
    }
  }, [session, user?.role, disconnect, router, sendSessionControl, stopCameraAndAnalysis])

  const handleSendChat = useCallback(() => {
    if (!newMessage.trim()) return
    try {
      sendChatMessage(newMessage.trim())
      setNewMessage("")
    } catch (err) {
      console.error("Chat send error:", err)
      setError("Failed to send message")
    }
  }, [newMessage, sendChatMessage])

  const leaveSession = useCallback(async () => {
    try {
      if (user?.role === "student") {
        try {
          await api.leaveSession(sessionId)
        } catch {}
      }
    } catch (err) {
      console.warn("leaveSession api failed", err)
    } finally {
      try {
        sendLeaveSession()
      } catch {}
      disconnect()
      const dashboardPath = user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
      router.push(dashboardPath)
    }
  }, [sessionId, user?.role, sendLeaveSession, disconnect, router])

  const retryConnection = useCallback(() => {
    setError("")
    setRetryCount(0)
    initializeSession(0)
  }, [initializeSession])

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [])

  const getFocusColor = useCallback((score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }, [])

  const getFocusLabel = useCallback((score: number) => {
    if (score >= 0.8) return "High Focus"
    if (score >= 0.6) return "Medium Focus"
    return "Low Focus"
  }, [])

  // UI render
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading session...</p>
          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">Attempt {retryCount}/3</p>
          )}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Session not found or you don't have access to it.</p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground mb-4">Failed after {retryCount} attempts</p>
            )}
            <div className="space-y-2">
              <Button className="w-full" onClick={retryConnection}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isInstructor = user?.role === "instructor"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold">{session.classroom_name}</h1>
                <p className="text-sm text-muted-foreground">Live Focus Session</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ConnectionStatus
                connected={connected}
                connecting={connecting}
                reconnecting={reconnecting}
                connectionState={connectionState}
                queuedMessages={queuedMessages}
                onReconnect={connect}
              />
              <Badge
                variant={
                  sessionStatus === "active"
                    ? "default"
                    : sessionStatus === "paused"
                    ? "secondary"
                    : sessionStatus === "ended"
                    ? "destructive"
                    : "outline"
                }
              >
                {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" className="ml-2" onClick={retryConnection}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {sessionEnded && (
          <Alert className="mb-6 bg-green-100 border-green-300">
            <AlertDescription className="text-green-800">
              Session has ended. Redirecting to dashboard...
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-mono">{formatTime(localElapsedTime)}</CardTitle>
                <CardDescription>Session Duration</CardDescription>
              </CardHeader>
              {isInstructor && (
                <CardContent className="flex justify-center space-x-2">
                  {sessionStatus === "waiting" && (
                    <Button onClick={() => handleSessionControl("start")}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Session
                    </Button>
                  )}
                  {sessionStatus === "active" && (
                    <>
                      <Button variant="outline" onClick={() => handleSessionControl("pause")}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                      <Button variant="destructive" onClick={() => handleSessionControl("end")}>
                        <Square className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                    </>
                  )}
                  {sessionStatus === "paused" && (
                    <>
                      <Button onClick={() => handleSessionControl("resume")}>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                      <Button variant="destructive" onClick={() => handleSessionControl("end")}>
                        <Square className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                    </>
                  )}
                </CardContent>
              )}
            </Card>

            {!isInstructor && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Focus Tracking
                  </CardTitle>
                  <CardDescription>Enable your camera to track focus during the session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant={cameraEnabled ? "destructive" : "default"} 
                        onClick={cameraEnabled ? disableCamera : enableCamera}
                        disabled={!analyzerInitialized}
                      >
                        {cameraEnabled ? (
                          <>
                            <CameraOff className="h-4 w-4 mr-2" />
                            Disable Camera
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Enable Camera
                          </>
                        )}
                      </Button>
                    </div>
                    {analyzing && (
                      <Badge variant="secondary" className="animate-pulse">
                        <Eye className="h-3 w-3 mr-1" />
                        Analyzing Focus...
                      </Badge>
                    )}
                  </div>

                  <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className={`w-full max-w-md mx-auto rounded-lg border ${cameraEnabled ? '' : 'hidden'} scale-x-[-1]`}
                  />
                  
                  {cameraEnabled && (
                    <div className="relative">
                      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        Live
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getFocusColor(myFocusScore)}`}>
                      {Math.round(myFocusScore * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">{getFocusLabel(myFocusScore)}</p>
                    <Progress value={myFocusScore * 100} className="mt-2" />
                  </div>

                  <Button variant="outline" onClick={leaveSession} className="w-full">
                    Leave Session
                  </Button>
                </CardContent>
              </Card>
            )}

            {isInstructor && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Student Focus Overview
                  </CardTitle>
                  <CardDescription>Real-time focus tracking for all participants</CardDescription>
                </CardHeader>
                <CardContent>
                  {participants.filter(p => p.role === 'student').length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No students have joined yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {participants
                        .filter(p => p.role === 'student')
                        .map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${p.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                            <div>
                              <span className="font-medium">{p.name}</span>
                              <div className="text-xs text-muted-foreground">Student</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getFocusColor(p.focus_score)}`}>
                              {Math.round(p.focus_score * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">{getFocusLabel(p.focus_score)}</div>
                            {p.last_focus_update && (
                              <div className="text-xs text-muted-foreground">
                                Updated {new Date(p.last_focus_update).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <RealTimeStats 
              stats={sessionStats} 
              loading={!connected} 
              sessionStatus={sessionStatus}
              connectionStatus={
                connected ? "connected" :
                connecting ? "connecting" :
                reconnecting ? "reconnecting" :
                "disconnected"
              }
              history={focusHistory}
              participants={participants}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chat
                    {chatMessages.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{chatMessages.length}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)}>
                    {showChat ? "Hide" : "Show"}
                  </Button>
                </CardTitle>
              </CardHeader>

              {showChat && (
                <CardContent className="space-y-4">
                  <ScrollArea className="h-64 w-full border rounded p-3">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm">No messages yet</p>
                    ) : (
                      <div className="space-y-2">
                        {chatMessages.map((m: any) => (
                          <div key={m.id} className="text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{m.user_name || m.user}:</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(m.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground ml-2">{m.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Type a message..." 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()} 
                      disabled={!connected} 
                    />
                    <Button 
                      size="sm" 
                      onClick={handleSendChat} 
                      disabled={!connected || !newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {!connected && (
                    <p className="text-xs text-muted-foreground">Chat disabled - not connected to session</p>
                  )}
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{new Date(session.start_time).toLocaleTimeString()}</span>
                </div>
                {session.end_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ended:</span>
                    <span>{new Date(session.end_time).toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{sessionStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{formatTime(localElapsedTime)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants:</span>
                  <span>{participants.filter(p => p.role === 'student').length} students</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instructors:</span>
                  <span>{participants.filter(p => p.role === 'instructor').length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}