"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, X, Download, Eye, RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AuditEntry {
  id: string
  adminUid: string
  adminEmail: string
  action: string
  resource: string
  before: unknown
  after: unknown
  ip: string | null
  severity: "low" | "medium" | "high"
  timestamp: string | null
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [adminFilter, setAdminFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null)
  const [reverting, setReverting] = useState(false)

  const fetchEntries = async (cursor?: string, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams()
      if (cursor) params.set("cursor", cursor)
      if (adminFilter) params.set("admin", adminFilter)
      if (actionFilter) params.set("action", actionFilter)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setEntries((prev) => [...prev, ...data.entries])
        } else {
          setEntries(data.entries)
        }
        setNextCursor(data.nextCursor)
      }
    } catch {
      toast.error("Failed to fetch audit log")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [adminFilter, actionFilter])

  const handleExportCsv = () => {
    if (entries.length === 0) return

    const headers = [
      "Timestamp",
      "Admin",
      "Action",
      "Resource",
      "Severity",
      "IP",
      "Before",
      "After",
    ]
    const rows = entries.map((e) => [
      e.timestamp || "",
      e.adminEmail,
      e.action,
      e.resource,
      e.severity,
      e.ip || "",
      JSON.stringify(e.before),
      JSON.stringify(e.after),
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exported to CSV")
  }

  const handleRevert = async (entry: AuditEntry) => {
    // Only allow reverting field-level edits (UPDATE_ actions on nfl-data)
    if (!entry.action.startsWith("UPDATE_") || !entry.resource.includes("/")) {
      toast.error("This action cannot be reverted")
      return
    }

    setReverting(true)
    const [table, id] = entry.resource.split("/")
    const field = entry.action
      .replace("UPDATE_", "")
      .replace(`${table.toUpperCase()}_`, "")
      .toLowerCase()

    try {
      const res = await fetch("/api/admin/nfl-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table,
          id,
          field,
          value: entry.before,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Revert failed")
      }

      toast.success("Change reverted successfully")
      setDetailEntry(null)
      // Refresh audit log
      fetchEntries()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Revert failed"
      toast.error(msg)
    } finally {
      setReverting(false)
    }
  }

  const isRevertable = (entry: AuditEntry) => {
    return (
      entry.action.startsWith("UPDATE_") &&
      entry.resource.includes("/") &&
      entry.before !== null &&
      entry.before !== undefined
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Complete history of all admin actions
      </p>

      <Separator className="mb-6" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            placeholder="Filter by admin email..."
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Filter by action..."
            autoComplete="off"
          />
        </div>
        {(adminFilter || actionFilter) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAdminFilter("")
              setActionFilter("")
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Audit table */}
      <div className="border-3 border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-3 border-border bg-muted/30">
              <th className="text-left px-4 py-2 font-semibold w-14">Sev.</th>
              <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">
                Time
              </th>
              <th className="text-left px-4 py-2 font-semibold">Admin</th>
              <th className="text-left px-4 py-2 font-semibold">Action</th>
              <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">
                Resource
              </th>
              <th className="px-4 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-12" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  </tr>
                ))
              : entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={`text-xs ${SEVERITY_STYLES[entry.severity]}`}
                      >
                        {entry.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                      {entry.timestamp
                        ? new Date(entry.timestamp).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 truncate max-w-[160px]">
                      {entry.adminEmail}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {entry.action}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                      {entry.resource}
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDetailEntry(entry)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && entries.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No audit entries found
          </div>
        )}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => fetchEntries(nextCursor, true)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!detailEntry}
        onOpenChange={(open) => !open && setDetailEntry(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Entry</DialogTitle>
          </DialogHeader>

          {detailEntry && (
            <div className="flex flex-col gap-0 text-sm">
              <DetailRow label="ID" value={detailEntry.id} mono />
              <DetailRow
                label="Time"
                value={
                  detailEntry.timestamp
                    ? new Date(detailEntry.timestamp).toLocaleString()
                    : "—"
                }
              />
              <DetailRow label="Admin" value={detailEntry.adminEmail} />
              <DetailRow label="Action" value={detailEntry.action} mono />
              <DetailRow label="Resource" value={detailEntry.resource} mono />
              <DetailRow label="IP" value={detailEntry.ip || "—"} />
              <DetailRow
                label="Severity"
                value={detailEntry.severity}
              />
              <DetailRow
                label="Before"
                value={JSON.stringify(detailEntry.before, null, 2)}
                mono
                pre
              />
              <DetailRow
                label="After"
                value={JSON.stringify(detailEntry.after, null, 2)}
                mono
                pre
              />

              {isRevertable(detailEntry) && (
                <div className="mt-4 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevert(detailEntry)}
                    disabled={reverting}
                  >
                    {reverting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Reverting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Revert This Change
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  pre,
}: {
  label: string
  value: string
  mono?: boolean
  pre?: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-1 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground w-20 shrink-0 text-xs font-medium">
        {label}
      </span>
      {pre ? (
        <pre className="text-xs font-mono whitespace-pre-wrap break-all flex-1 bg-muted/30 p-1.5">
          {value}
        </pre>
      ) : (
        <span
          className={`text-xs break-all flex-1 ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
      )}
    </div>
  )
}
