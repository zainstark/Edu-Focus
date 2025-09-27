"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Users, Calendar, Copy, Check, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function InstructorClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [newClassroom, setNewClassroom] = useState({
    name: "",
    description: "",
  })
  const router = useRouter()

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const fetchClassrooms = async () => {
    try {
      const data = await api.getClassrooms()
      setClassrooms(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classrooms")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const classroom = await api.createClassroom(newClassroom)
      setClassrooms([classroom, ...classrooms])
      setCreateDialogOpen(false)
      setNewClassroom({ name: "", description: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create classroom")
    } finally {
      setCreateLoading(false)
    }
  }

  const copyJoinCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy join code:", err)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Manage Classrooms">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Manage Classrooms">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Classrooms</h2>
            <p className="text-muted-foreground">Create and manage your focus tracking classrooms</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Classroom</DialogTitle>
                <DialogDescription>Set up a new classroom for focus tracking sessions</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClassroom}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Classroom Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Advanced Mathematics"
                      value={newClassroom.name}
                      onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                      required
                      disabled={createLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the classroom..."
                      value={newClassroom.description}
                      onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                      disabled={createLoading}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading}>
                    {createLoading ? "Creating..." : "Create Classroom"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classrooms Grid */}
        {classrooms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No classrooms yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create your first classroom to start tracking student focus and engagement during sessions.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Classroom
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
                  {/* Join Code */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Join Code</p>
                      <p className="text-lg font-mono">{classroom.join_code}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyJoinCode(classroom.join_code)}
                      className="shrink-0"
                    >
                      {copiedCode === classroom.join_code ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {new Date(classroom.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => router.push(`/classroom/${classroom.id}`)}>
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/classroom/${classroom.id}/settings`)}
                    >
                      <Settings className="h-4 w-4" />
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
