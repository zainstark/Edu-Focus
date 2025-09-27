"use client"

import React, { useMemo, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { SessionStats } from "@/lib/websocket"
import { Users, TrendingUp, Clock, Activity } from "lucide-react"

interface HistoryPoint {
  ts: number
  avg: number
}

interface RealTimeStatsProps {
  stats: SessionStats | null
  history?: HistoryPoint[]
  loading?: boolean
  sessionStatus?: "waiting" | "active" | "paused" | "ended"
  connectionStatus?: "connected" | "connecting" | "reconnecting" | "disconnected"
  // Add participants prop to filter students
  participants?: Array<{id: number, role: string, is_active: boolean}> 
}

export function RealTimeStats({ 
  stats, 
  history = [], 
  loading = false, 
  sessionStatus = "waiting",
  connectionStatus = "disconnected",
  participants = [] // Add participants prop
}: RealTimeStatsProps) {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    setLastUpdate(Date.now());
  }, [stats, history, participants]); // Add participants to dependency

  // Calculate student-only stats if participants are provided
  const studentParticipants = participants.filter(p => p.role === 'student');
  const activeStudents = studentParticipants.filter(p => p.is_active).length;
  const totalStudents = studentParticipants.length;

  // Use provided stats or calculate from participants
  const effectiveStats = stats || {
    total_participants: totalStudents,
    active_participants: activeStudents,
    average_focus_score: 0,
    session_duration: 0,
    focus_distribution: { high: 0, medium: 0, low: 0 }
  }

  // Override with student-only counts if participants are provided
  const effectiveTotal = participants.length > 0 ? totalStudents : effectiveStats.total_participants;
  const effectiveActive = participants.length > 0 ? activeStudents : effectiveStats.active_participants;
  
  const effectiveAvg = effectiveStats.average_focus_score;
  const effectiveDuration = effectiveStats.session_duration;
  const distribution = effectiveStats.focus_distribution;

  const hasHistory = Array.isArray(history) && history.length > 0;
  const currentFocus = hasHistory ? history[history.length - 1]?.avg : effectiveAvg;

  // Rest of the component remains the same...
  const sparkline = useMemo(() => {
    if (!hasHistory) return null;

    const width = 120;
    const height = 40;
    const padding = 4;
    const pts = history.map((h, i) => ({ 
      x: (i / Math.max(1, history.length - 1)) * (width - padding * 2) + padding, 
      yRaw: h.avg 
    }));

    const vals = history.map((h) => h.avg);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const range = max - min || 1;

    const ptsScaled = pts.map((p) => {
      const y = height - padding - ((p.yRaw - min) / range) * (height - padding * 2);
      return { x: p.x, y };
    });

    if (ptsScaled.length === 1) {
      const p = ptsScaled[0];
      return { viewBox: `0 0 ${width} ${height}`, path: `M ${p.x} ${p.y} L ${p.x + 1} ${p.y}`, last: ptsScaled[0] };
    }
    
    const d = ptsScaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    return { viewBox: `0 0 ${width} ${height}`, path: d, last: ptsScaled[ptsScaled.length - 1] };
  }, [history, hasHistory]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getFocusColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "paused": return "bg-yellow-500";
      case "ended": return "bg-red-500";
      default: return "bg-gray-300";
    }
  };

  const getConnectionColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-500";
      case "connecting": return "bg-yellow-500";
      case "reconnecting": return "bg-yellow-500";
      default: return "bg-red-500";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Session Statistics
          </CardTitle>
          <CardDescription>Connecting to session data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Live Session Statistics
        </CardTitle>
        <CardDescription>Real-time student analytics for this session</CardDescription> {/* Updated description */}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${getConnectionColor(connectionStatus)}`} />
            <span className="text-sm font-medium capitalize">{connectionStatus}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(sessionStatus)}`} />
            <span className="text-sm font-medium capitalize">{sessionStatus}</span>
          </div>
        </div>

        {/* Focus Score with Sparkline */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-muted-foreground">Current Focus</h3>
            <div className={`text-2xl font-bold ${getFocusColor(currentFocus)}`}>
              {Math.round(currentFocus * 100)}%
            </div>
          </div>
          {sparkline && (
            <svg width={140} height={48} viewBox={sparkline.viewBox} className="ml-2">
              <path 
                d={sparkline.path} 
                stroke="currentColor" 
                strokeWidth={2} 
                fill="none" 
                className="text-blue-500 opacity-90" 
              />
              <path
                d={`${sparkline.path} L ${sparkline.last.x.toFixed(2)} 40 L ${0} 40 Z`}
                fill="rgba(59,130,246,0.08)"
                stroke="none"
              />
            </svg>
          )}
        </div>

        {/* Key Metrics Grid - Updated labels for students */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center mb-2">
              <Users className="h-4 w-4 mr-1 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{effectiveActive}</div>
            <div className="text-xs text-muted-foreground">Active Students</div> {/* Updated label */}
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 mr-1 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{Math.round(effectiveAvg * 100)}%</div>
            <div className="text-xs text-muted-foreground">Avg Focus</div>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatDuration(effectiveDuration)}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>

        {/* Average Focus Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Average Focus Score</span>
            <span className={`text-sm font-bold ${getFocusColor(effectiveAvg)}`}>
              {Math.round(effectiveAvg * 100)}%
            </span>
          </div>
          <Progress value={Math.round(effectiveAvg * 100)} className="h-2" />
        </div>

        {/* Focus Distribution */}
        <div>
          <h4 className="text-sm font-medium mb-3">Focus Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">High Focus (80%+)</span>
              </div>
              <Badge variant="outline">{distribution.high}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm">Medium Focus (60-79%)</span>
              </div>
              <Badge variant="outline">{distribution.medium}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm">Low Focus (&lt;60%)</span>
              </div>
              <Badge variant="outline">{distribution.low}</Badge>
            </div>
          </div>
        </div>

        {/* Participation Rate - Updated for students */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Student Participation</span> {/* Updated label */}
            <span className="text-sm font-bold">
              {effectiveTotal > 0 ? Math.round((effectiveActive / effectiveTotal) * 100) : 0}%
            </span>
          </div>
          <Progress 
            value={effectiveTotal > 0 ? (effectiveActive / effectiveTotal) * 100 : 0} 
            className="h-2" 
          />
          <div className="text-xs text-muted-foreground mt-1">
            {effectiveActive} of {effectiveTotal} students active {/* Updated label */}
          </div>
        </div>

        {/* Data Freshness */}
        <div className="text-xs text-muted-foreground text-center">
          Updated {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}