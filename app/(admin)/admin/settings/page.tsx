"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useAdmin } from "../layout"

export default function SettingsPage() {
  const admin = useAdmin()

  // Yahoo connection state
  const [yahooStatus, setYahooStatus] = useState<{
    isConnected: boolean
    isConfigured: boolean
  } | null>(null)
  const [yahooLoading, setYahooLoading] = useState(true)
  const [showDisconnect, setShowDisconnect] = useState(false)

  // Check for OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("yahoo_connected") === "true") {
      toast.success("Yahoo connected successfully")
      window.history.replaceState({}, "", "/admin/settings")
    }
    if (params.get("yahoo_error")) {
      toast.error(`Yahoo error: ${params.get("yahoo_error")}`)
      window.history.replaceState({}, "", "/admin/settings")
    }
  }, [])

  // Fetch Yahoo connection status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/yahoo/status")
        if (res.ok) {
          setYahooStatus(await res.json())
        }
      } catch {
        // silent
      } finally {
        setYahooLoading(false)
      }
    }
    fetchStatus()
  }, [])

  const handleYahooConnect = () => {
    window.location.href = "/api/yahoo/auth"
  }

  const handleYahooDisconnect = async () => {
    try {
      const res = await fetch("/api/yahoo/status", { method: "DELETE" })
      if (res.ok) {
        setYahooStatus((prev) => prev ? { ...prev, isConnected: false } : null)
        toast.success("Yahoo disconnected")
      }
    } catch {
      toast.error("Failed to disconnect Yahoo")
    } finally {
      setShowDisconnect(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        App configuration and admin info
      </p>

      <Separator className="mb-6" />

      {/* Current Admin */}
      <h2 className="text-lg font-semibold mb-3">Current Session</h2>
      <div className="border-3 border-border mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Admin Email</span>
          <span className="text-sm font-medium">{admin.adminEmail}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Admin UID</span>
          <span className="text-xs font-mono text-muted-foreground">
            {admin.adminUid}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Environment</span>
          <Badge variant="outline" className="text-xs">
            {process.env.NODE_ENV === "production"
              ? "Production"
              : "Development"}
          </Badge>
        </div>
      </div>

      {/* Yahoo Integration */}
      <h2 className="text-lg font-semibold mb-3">Yahoo Fantasy</h2>
      <div className="border-3 border-border mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">OAuth Credentials</span>
          {yahooLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <Badge
              variant="outline"
              className={`text-xs ${
                yahooStatus?.isConfigured
                  ? "text-primary"
                  : "text-yellow-600"
              }`}
            >
              {yahooStatus?.isConfigured ? "Configured" : "Not Configured"}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Connection Status</span>
          {yahooLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <Badge
              variant="outline"
              className={`text-xs ${
                yahooStatus?.isConnected
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {yahooStatus?.isConnected ? "Connected" : "Not Connected"}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {yahooStatus?.isConnected
              ? "Disconnect to revoke access"
              : "Connect to enable Yahoo ADP data"}
          </span>
          {yahooStatus?.isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnect(true)}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleYahooConnect}
              disabled={!yahooStatus?.isConfigured}
            >
              Connect Yahoo
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Yahoo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the stored OAuth tokens. Yahoo ADP data already
              imported will remain in the database, but new data cannot be
              fetched until reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleYahooDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Environment Info */}
      <h2 className="text-lg font-semibold mb-3">Environment</h2>
      <div className="border-3 border-border mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Firebase Project</span>
          <span className="text-sm font-mono text-xs">
            {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">
            Admin Session Duration
          </span>
          <span className="text-sm">
            {process.env.ADMIN_SESSION_DURATION_HOURS || "8"} hours
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">DB Readonly</span>
          <Badge
            variant="outline"
            className={`text-xs ${
              process.env.DB_READONLY === "true"
                ? "text-yellow-600"
                : "text-primary"
            }`}
          >
            {process.env.DB_READONLY === "true" ? "Yes" : "No"}
          </Badge>
        </div>
      </div>

      {/* Notes */}
      <h2 className="text-lg font-semibold mb-3">Production Checklist</h2>
      <div className="border-3 border-border">
        <ul className="text-sm px-4 py-3 flex flex-col gap-2">
          <ChecklistItem label="Admin session cookies are HttpOnly + Secure + SameSite=Strict" />
          <ChecklistItem label="ADMIN_SESSION_SECRET is 64+ random characters" />
          <ChecklistItem label="Firestore rules deny client writes to audit_log" />
          <ChecklistItem label="admin.yourapp.com is IP-restricted at Nginx/Cloudflare" />
          <ChecklistItem label="Firebase Admin SDK credentials are set" />
          <ChecklistItem label="nfl.db is in .gitignore" />
          <ChecklistItem label="Service account key is never in Git" />
        </ul>
      </div>
    </div>
  )
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-muted-foreground">[ ]</span>
      <span className="text-muted-foreground">{label}</span>
    </li>
  )
}
