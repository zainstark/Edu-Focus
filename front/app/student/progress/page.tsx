"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { BookOpen } from "lucide-react"

export default function StudentProgress() {
  const router = useRouter()

  return (
    <DashboardLayout title="My Progress">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Progress</h2>
            <p className="text-muted-foreground">Track your learning journey</p>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Your session progress and focus analytics will appear here after participating in live classes.
            </p>
            <Button onClick={() => router.push("/student/classes")}>View Available Classes</Button>
          </CardContent>
        </Card>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Understanding your progress metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                Your focus score is calculated during live sessions based on your engagement and attention.
              </p>
              <p className="text-sm">
                Join classes regularly to build a comprehensive progress history and identify patterns in your learning.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips for Success</CardTitle>
              <CardDescription>Maximize your learning potential</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">• Find a quiet, distraction-free environment for classes</p>
              <p className="text-sm">• Participate actively in discussions and activities</p>
              <p className="text-sm">• Take regular breaks during longer sessions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}