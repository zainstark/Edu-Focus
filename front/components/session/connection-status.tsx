"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react"

interface ConnectionStatusProps {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  connectionState: "connecting" | "open" | "closing" | "closed"
  queuedMessages: number
  onReconnect?: () => void
}

export function ConnectionStatus({
  connected,
  connecting,
  reconnecting,
  connectionState,
  queuedMessages,
  onReconnect,
}: ConnectionStatusProps) {
  const getStatusBadge = () => {
    if (reconnecting) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Reconnecting...
        </Badge>
      )
    }

    if (connecting) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Connecting...
        </Badge>
      )
    }

    if (connected) {
      return (
        <Badge variant="default">
          <Wifi className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      )
    }

    return (
      <Badge variant="destructive">
        <WifiOff className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
    )
  }

  const showAlert = !connected && !connecting && !reconnecting

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {getStatusBadge()}
        {queuedMessages > 0 && (
          <Badge variant="outline" className="text-xs">
            {queuedMessages} queued
          </Badge>
        )}
      </div>

      {showAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connection lost. Some features may not work.</span>
            {onReconnect && (
              <Button size="sm" variant="outline" onClick={onReconnect}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
