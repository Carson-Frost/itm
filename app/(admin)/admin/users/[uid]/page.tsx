"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
import { ShieldOff, ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface UserDetail {
  user: {
    uid: string
    email: string
    displayName: string | null
    disabled: boolean
    creationTime: string | null
    lastSignInTime: string | null
    providerData: { providerId: string }[]
  }
  profile: {
    username: string
    createdAt: string | null
    updatedAt: string | null
  } | null
  rankings: {
    id: string
    name: string
    type: string
    scoring: string
    qbFormat: string
    playerCount: number
    createdAt: string | null
    updatedAt: string | null
  }[]
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>
}) {
  const { uid } = use(params)
  const router = useRouter()
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<
    "disable" | "enable" | null
  >(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${uid}`)
        if (res.ok) {
          setData(await res.json())
        } else {
          toast.error("Failed to load user")
        }
      } catch {
        toast.error("Failed to load user")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [uid])

  const handleAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: confirmAction }),
      })

      if (!res.ok) {
        throw new Error("Action failed")
      }

      toast.success(
        confirmAction === "disable" ? "User disabled" : "User enabled"
      )
      // Refresh data
      const refreshRes = await fetch(`/api/admin/users/${uid}`)
      if (refreshRes.ok) {
        setData(await refreshRes.json())
      }
    } catch {
      toast.error("Action failed")
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/users">Users</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {loading ? "Loading..." : data?.profile?.username || data?.user.email || uid}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground">User not found</p>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-bold">
              {data.profile?.username || data.user.displayName || "Unknown User"}
            </h1>
            {data.user.disabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction("enable")}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Enable Account
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmAction("disable")}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable Account
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">
              {data.user.email}
            </span>
            {data.user.disabled ? (
              <Badge variant="destructive" className="text-xs">
                Disabled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Active
              </Badge>
            )}
          </div>

          <Separator className="mb-6" />

          {/* User info */}
          <h2 className="text-lg font-semibold mb-3">Account Info</h2>
          <div className="border-3 border-border mb-8">
            <InfoRow label="UID" value={data.user.uid} mono />
            <InfoRow
              label="Email"
              value={data.user.email || "—"}
            />
            <InfoRow
              label="Username"
              value={data.profile?.username || "—"}
            />
            <InfoRow
              label="Provider"
              value={
                data.user.providerData
                  .map((p) => p.providerId)
                  .join(", ") || "—"
              }
            />
            <InfoRow
              label="Created"
              value={
                data.user.creationTime
                  ? new Date(data.user.creationTime).toLocaleString()
                  : "—"
              }
            />
            <InfoRow
              label="Last Sign In"
              value={
                data.user.lastSignInTime
                  ? new Date(data.user.lastSignInTime).toLocaleString()
                  : "—"
              }
              last
            />
          </div>

          {/* Rankings */}
          <h2 className="text-lg font-semibold mb-3">
            Rankings ({data.rankings.length})
          </h2>
          <div className="border-3 border-border">
            {data.rankings.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No rankings
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-3 border-border bg-muted/30">
                    <th className="text-left px-4 py-2 font-semibold">Name</th>
                    <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">
                      Type
                    </th>
                    <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">
                      Scoring
                    </th>
                    <th className="text-center px-4 py-2 font-semibold">
                      Players
                    </th>
                    <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankings.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-4 py-2 hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {r.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
                        {r.scoring} / {r.qbFormat}
                      </td>
                      <td className="px-4 py-2 text-center tabular-nums">
                        {r.playerCount}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Confirm action dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "disable"
                ? "Disable User Account"
                : "Enable User Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "disable"
                ? `This will prevent ${data?.user.email} from logging in. They will not be able to access their account until re-enabled.`
                : `This will restore login access for ${data?.user.email}.`}
              {" "}This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={
                confirmAction === "disable"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "btn-chamfer text-primary-foreground"
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : confirmAction === "disable" ? (
                "Disable Account"
              ) : (
                "Enable Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
  last,
}: {
  label: string
  value: string
  mono?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-2.5 ${
        !last ? "border-b border-border/50" : ""
      }`}
    >
      <span className="text-sm text-muted-foreground w-28 shrink-0 font-medium">
        {label}
      </span>
      <span
        className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
