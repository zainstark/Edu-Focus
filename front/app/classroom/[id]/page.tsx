"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, type Classroom, type Session } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Play, Users, Copy, Check, Clock } from "lucide-react"

export default function ClassroomDetail() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const classroomId = Number(params.id)

  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [createSessionLoading, setCreateSessionLoading] = useState(false)

  const isInstructor = user?.role === "instructor"

  useEffect(() => {
    fetchClassroomData()
  }, [classroomId])

  const fetchClassroomData = async () => {
    try {
      const [classroomData, sessionsData] = await Promise.all([
        api.getClassroom(classroomId),
        api.getSessions(),
      ])
      setClassroom(classroomData)
      // Filter sessions for this classroom
      setSessions(sessionsData.filter((session) => session.classroom === classroomId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classroom data")
    } finally {
      setLoading(false)
    }
  }

  const copyJoinCode = async () => {
    if (!classroom) return
    try {
      await navigator.clipboard.writeText(classroom.join_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      console.error("Failed to copy join code:", err)
    }
  }

  const createSession = async () => {
    if (!classroom) return
    setCreateSessionLoading(true)

    try {
      const newSession = await api.createSession(classroom.id)
      setSessions([newSession, ...sessions])
      // Redirect to the new session
      router.push(`/session/${newSession.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session")
    } finally {
      setCreateSessionLoading(false)
    }
  }

  const activeSessions = sessions.filter((session) => session.is_active)
  const pastSessions = sessions.filter((session) => !session.is_active)

  if (loading) {
    return (
      <DashboardLayout title="Classroom">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!classroom) {
    return (
      <DashboardLayout title="Classroom Not Found">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Classroom not found or you don't have access to it.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={classroom.name}>
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Classroom Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{classroom.name}</CardTitle>
                <CardDescription className="text-base">{classroom.description}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                <Users className="h-4 w-4 mr-1" />
                {classroom.student_count} students
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Join Code (for instructors) */}
              {isInstructor && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Join Code</p>
                    <p className="text-xl font-mono">{classroom.join_code}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyJoinCode}>
                    {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {/* Instructor Info (for students) */}
              {!isInstructor && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Instructor</p>
                  <p className="text-lg">{classroom.instructor_name}</p>
                </div>
              )}

              {/* Created Date */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Created</p>
                <p className="text-lg">{new Date(classroom.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Actions */}
            {isInstructor && (
              <div className="flex gap-2">
                <Button onClick={createSession} disabled={createSessionLoading}>
                  {createSessionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start New Session
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Currently running focus tracking sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Play className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Live Session</h3>
                        <p className="text-sm text-muted-foreground">
                          Started: {new Date(session.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Live</Badge>
                      <Button size="sm" onClick={() => router.push(`/session/${session.id}`)}>
                        {isInstructor ? "Manage Session" : "Join Session"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Previous focus tracking sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {pastSessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
                <p className="text-muted-foreground">
                  {isInstructor
                    ? "Start your first session to begin tracking student focus"
                    : "Sessions will appear here once your instructor starts them"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-muted p-2 rounded-full">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">Session #{session.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.start_time).toLocaleDateString()} -{" "}
                          {session.end_time ? new Date(session.end_time).toLocaleTimeString() : "Ongoing"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {pastSessions.length > 5 && (
                  <div className="text-center">
                    <Button variant="outline" onClick={() => router.push(`/classroom/${classroom.id}/sessions`)}>
                      View All Sessions ({pastSessions.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}