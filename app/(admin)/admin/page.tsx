"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Users,
  ScrollText,
  BarChart3,
  ArrowRight,
} from "lucide-react"

interface OverviewData {
  userCount: number
  dbTables: { name: string; rowCount: number }[]
  lastUpdated: string | null
  recentAuditCount: number
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch("/api/admin/overview")
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // Silently fail — stats are non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [])

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Overview</h1>
      <p className="text-sm text-muted-foreground mb-6">
        System status and quick access
      </p>

      <Separator className="mb-6" />

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Users"
          value={loading ? null : String(data?.userCount ?? "—")}
        />
        <StatCard
          icon={Database}
          label="DB Tables"
          value={loading ? null : String(data?.dbTables?.length ?? "—")}
        />
        <StatCard
          icon={BarChart3}
          label="Total Rows"
          value={
            loading
              ? null
              : data?.dbTables
                ? data.dbTables
                    .reduce((sum, t) => sum + t.rowCount, 0)
                    .toLocaleString()
                : "—"
          }
        />
        <StatCard
          icon={ScrollText}
          label="Audit Entries"
          value={loading ? null : String(data?.recentAuditCount ?? "—")}
        />
      </div>

      {/* DB table breakdown */}
      <h2 className="text-lg font-semibold mb-3">Database Tables</h2>
      <div className="border-3 border-border mb-8">
        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-3 border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-semibold">Table</th>
                <th className="text-right px-4 py-2 font-semibold">Rows</th>
              </tr>
            </thead>
            <tbody>
              {data?.dbTables?.map((t) => (
                <tr
                  key={t.name}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2 font-mono text-xs">{t.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.rowCount.toLocaleString()}
                  </td>
                </tr>
              )) ?? (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-muted-foreground">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <h2 className="text-lg font-semibold mb-3">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickLink
          href="/admin/connections"
          label="Connections"
          description="Create and schedule daily puzzles"
        />
        <QuickLink
          href="/admin/nfl-data"
          label="Browse NFL Data"
          description="View and edit player stats, rosters, and schedules"
        />
        <QuickLink
          href="/admin/users"
          label="Manage Users"
          description="View user accounts and ranking data"
        />
        <QuickLink
          href="/admin/audit"
          label="Audit Log"
          description="Review all admin actions"
        />
        <QuickLink
          href="/admin/settings"
          label="Settings"
          description="Configure app-level settings"
        />
      </div>

      {data?.lastUpdated && (
        <p className="text-xs text-muted-foreground mt-8">
          NFL data last updated: {data.lastUpdated}
        </p>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
}) {
  return (
    <div className="border-3 border-border p-4 flex items-center gap-3">
      <Icon className="h-5 w-5 text-primary shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-6 w-16 mt-0.5" />
        ) : (
          <p className="text-xl font-bold tabular-nums">{value}</p>
        )}
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="border-3 border-border p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group"
    >
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  )
}
