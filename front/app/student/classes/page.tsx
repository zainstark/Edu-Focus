"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, type Classroom } from "@/lib/api"
import { Plus, BookOpen, Users, Calendar, GraduationCap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StudentClasses() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const fetchClassrooms = async () => {
    try {
      const data = await api.getClassrooms()
      setClassrooms(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinLoading(true)

    try {
      await api.joinClassroom(joinCode)
      setJoinDialogOpen(false)
      setJoinCode("")
      await fetchClassrooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join classroom")
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="My Classes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Classes">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Classes</h2>
            <p className="text-muted-foreground">View your enrolled classes and join new ones</p>
          </div>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Join Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
                <DialogDescription>Enter the join code provided by your instructor</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinClass}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinCode">Join Code</Label>
                    <Input
                      id="joinCode"
                      placeholder="Enter join code..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                      disabled={joinLoading}
                      className="font-mono text-center text-lg"
                    />
                    <p className="text-sm text-muted-foreground">Ask your instructor for the classroom join code</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setJoinDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={joinLoading || !joinCode.trim()}>
                    {joinLoading ? "Joining..." : "Join Class"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {classrooms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No classes joined yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Join your first class using a join code from your instructor to start tracking your focus and
                engagement.
              </p>
              <Button onClick={() => setJoinDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Join Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <Card key={classroom.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{classroom.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{classroom.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{classroom.student_count} students</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>Instructor: {classroom.instructor_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Joined {new Date(classroom.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {classroom.student_count} students
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => router.push(`/classroom/${classroom.id}`)}>
                      View Class
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
