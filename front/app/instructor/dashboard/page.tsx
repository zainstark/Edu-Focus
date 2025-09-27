"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api, type Classroom, type Session } from "@/lib/api"
import { Users, BookOpen, Play, Plus, Clock, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

function ensureError(value: unknown): Error {
  if (value instanceof Error) return value;
  let stringified = '[Unable to stringify the thrown value]';
  try {
    stringified = JSON.stringify(value);
  } catch {}
  return new Error(`This value was thrown as is, not through an Error: ${stringified}`);
}

export default function InstructorDashboard() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [creatingSessionFor, setCreatingSessionFor] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const router = useRouter()

  const fetchData = async () => {
    try {
      setRefreshing(true)
      console.log("Refreshing instructor dashboard data...")
      
      const [classroomsData, sessionsData] = await Promise.all([
        api.getClassrooms(), 
        api.getSessions()
      ])
      
      setClassrooms(classroomsData)
      setSessions(sessionsData)
      setLastUpdate(new Date())
      setError("")
    } catch (err) {
      const error = ensureError(err)
      setError(error.message)
      toast.error(`Failed to load data: ${error.message}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculate session counts from sessions data
  const getSessionCountForClassroom = (classroomId: number): number => {
    return sessions.filter(session => session.classroom === classroomId).length;
  };

  const getActiveSessionsForClassroom = (classroomId: number): Session[] => {
    return sessions.filter(session => session.classroom === classroomId && session.is_active);
  };

  const activeSessions = sessions.filter((session) => session.is_active)
  const totalStudents = classrooms.reduce((sum, classroom) => sum + classroom.student_count, 0)
  const totalSessions = sessions.length; // Direct count from sessions array

  const handleStartSessionForClassroom = async (classroomId: number) => {
    if (creatingSessionFor) return;
    
    setCreatingSessionFor(classroomId);
    setError("");
    
    try {
      console.log("Creating session for classroom:", classroomId);
      
      const sessionData = await api.createSession(classroomId);
      console.log("Session creation response:", sessionData);
      
      if (!sessionData || !sessionData.id) {
        throw new Error("Failed to create session: No session ID returned");
      }
      
      // Navigate directly with the new session ID
      router.push(`/session/${sessionData.id}`);
    } catch (err) {
      const error = ensureError(err);
      console.error("Failed to start session:", error);
      const errorMessage = error.message || "Failed to create session";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCreatingSessionFor(null);
    }
  };

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    toast.success("Data refreshed")
  }

  if (loading) {
    return (
      <DashboardLayout title="Instructor Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Instructor Dashboard">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
              {refreshing && " (Refreshing...)"}
            </p>
          </div>
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              <Button 
                onClick={refreshData} 
                variant="outline" 
                size="sm" 
                className="mt-2"
                disabled={refreshing}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classrooms</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classrooms.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
            </CardContent>
          </Card>
        </div>

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
                        <h3 className="font-medium">{session.classroom_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Started: {new Date(session.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Live</Badge>
                      <Button size="sm" onClick={() => router.push(`/session/${session.id}`)}>
                        Join Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Classrooms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Classrooms</CardTitle>
              <CardDescription>Manage your classes and start new sessions</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={refreshData} variant="outline" disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => router.push("/instructor/classrooms")}>
                <Plus className="h-4 w-4 mr-2" />
                New Classroom
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {classrooms.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No classrooms yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first classroom to start tracking student focus
                </p>
                <Button onClick={() => router.push("/instructor/classrooms")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Classroom
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classrooms.slice(0, 4).map((classroom) => {
                  const inProgress = creatingSessionFor === classroom.id
                  const sessionCount = getSessionCountForClassroom(classroom.id)
                  const activeSessionsForClassroom = getActiveSessionsForClassroom(classroom.id)
                  
                  return (
                    <Card key={classroom.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{classroom.name}</CardTitle>
                          <Badge variant="outline">{classroom.student_count} students</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{classroom.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                            {activeSessionsForClassroom.length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {activeSessionsForClassroom.length} active
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Join code: <Badge variant="secondary" className="ml-1">{classroom.join_code}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            Created {new Date(classroom.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" onClick={() => router.push(`/classroom/${classroom.id}`)}>
                              View Details
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStartSessionForClassroom(classroom.id)}
                              disabled={inProgress}
                            >
                              {inProgress ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Starting…
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Session
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}