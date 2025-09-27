"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api, type Classroom, type Session } from "@/lib/api"
import { BookOpen, Play, Clock, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StudentDashboard() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  // Memoized fetch function
  const fetchData = useCallback(async () => {
    try {
      console.log("Refreshing student dashboard data...")
      const [classroomsData, sessionsData] = await Promise.all([
        api.getClassrooms(),
        api.getSessions(),
      ])
      setClassrooms(classroomsData)
      setSessions(sessionsData)
      setLastUpdate(new Date())
      setError("")
    } catch (err) {
      console.error("Dashboard refresh error:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    }
  }, [])

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    initializeData()
  }, [fetchData])

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) { // Only refresh if tab is active
        fetchData()
      }
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(interval)
  }, [fetchData])

  // Manual refresh function
  const manualRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const activeSessions = sessions.filter((session) => session.is_active)

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
              {refreshing && " (Refreshing...)"}
            </p>
          </div>
          <Button onClick={manualRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              <Button 
                onClick={manualRefresh} 
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classrooms.length}</div>
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
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Join Active Sessions</CardTitle>
              <CardDescription>Live focus tracking sessions you can join</CardDescription>
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

        {/* My Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Classes you're enrolled in</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push("/student/classes")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {classrooms.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No classes enrolled</h3>
                <p className="text-muted-foreground mb-4">
                  Join a classroom using a join code to start tracking your focus
                </p>
                <Button onClick={() => router.push("/student/classes")}>Join a Class</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classrooms.slice(0, 4).map((classroom) => (
                  <Card key={classroom.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{classroom.name}</CardTitle>
                        <Badge variant="outline">{classroom.student_count} students</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{classroom.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          Instructor: {classroom.instructor_name}
                        </div>
                        <Button size="sm" onClick={() => router.push(`/classroom/${classroom.id}`)}>
                          View Class
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}