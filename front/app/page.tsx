"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Users, BarChart3, Eye } from "lucide-react"

export default function HomePage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Redirect based on user role
      if (user?.role === "instructor") {
        router.push("/instructor/dashboard")
      } else if (user?.role === "student") {
        router.push("/student/dashboard")
      }
    }
  }, [isAuthenticated, user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary rounded-full p-3 mr-3">
              <Eye className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">EduFocus</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Real-time focus tracking and analytics for educational environments. Monitor engagement, track performance,
            and enhance learning outcomes.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="bg-secondary/10 rounded-full p-3 w-fit mx-auto mb-4">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Real-Time Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track student focus and engagement in real-time during live sessions with instant feedback.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-primary/10 rounded-full p-3 w-fit mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Detailed Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate comprehensive reports with focus scores, attendance tracking, and performance insights.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-secondary/10 rounded-full p-3 w-fit mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Enhanced Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Improve educational outcomes through data-driven insights and personalized feedback.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Join EduFocus to start tracking and improving focus in your educational environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => router.push("/auth/login")} className="w-full" size="lg">
                Sign In
              </Button>
              <Button onClick={() => router.push("/auth/register")} variant="outline" className="w-full" size="lg">
                Create Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
