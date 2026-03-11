"use client"

import { useState, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, ChevronRight, Download } from "lucide-react"
import { toast } from "sonner"

// -------------------------------------------------------------------
// Types & helpers
// -------------------------------------------------------------------

interface NFLState {
  season: number
  seasonType: "pre" | "regular" | "post"
  week: number
  displayWeek: number
  leg: number
  seasonStartDate: string
  leagueSeason: string
  previousSeason: string
  updatedAt: string
}

type SeasonType = NFLState["seasonType"]

const STAGE_LABELS: Record<SeasonType, string> = {
  pre: "Pre-season",
  regular: "Regular Season",
  post: "Post-season",
}

const MAX_WEEKS: Record<SeasonType, number> = {
  pre: 4,
  regular: 18,
  post: 4,
}

function getNextState(s: NFLState): Omit<NFLState, "updatedAt"> {
  const base = {
    displayWeek: 0,
    leg: s.leg,
    seasonStartDate: s.seasonStartDate,
    leagueSeason: s.leagueSeason,
    previousSeason: s.previousSeason,
  }

  switch (s.seasonType) {
    case "pre": {
      if (s.week >= MAX_WEEKS.pre)
        return { ...base, season: s.season, seasonType: "regular", week: 1, displayWeek: 1 }
      return { ...base, season: s.season, seasonType: "pre", week: s.week + 1, displayWeek: s.week + 1 }
    }
    case "regular": {
      if (s.week >= MAX_WEEKS.regular)
        return { ...base, season: s.season, seasonType: "post", week: 1, displayWeek: 1 }
      return { ...base, season: s.season, seasonType: "regular", week: s.week + 1, displayWeek: s.week + 1 }
    }
    case "post": {
      if (s.week >= MAX_WEEKS.post)
        return {
          ...base, season: s.season + 1, seasonType: "pre", week: 1, displayWeek: 1,
          previousSeason: String(s.season), leagueSeason: String(s.season + 1),
        }
      return { ...base, season: s.season, seasonType: "post", week: s.week + 1, displayWeek: s.week + 1 }
    }
  }
}

function formatStateLabel(s: { season: number; seasonType: SeasonType; week: number }): string {
  return `${s.season} ${STAGE_LABELS[s.seasonType]} Wk ${s.week}`
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function ManageDataPage() {
  // Persisted state from DB
  const [saved, setSaved] = useState<NFLState | null>(null)
  const [loading, setLoading] = useState(true)

  // Draft state — what the user is editing before saving
  const [draftSeason, setDraftSeason] = useState("")
  const [draftType, setDraftType] = useState<SeasonType>("regular")
  const [draftWeek, setDraftWeek] = useState("")

  // Sleeper preview (read-only, shown after fetch)
  const [sleeperPreview, setSleeperPreview] = useState<Omit<NFLState, "updatedAt"> | null>(null)

  // Action states
  const [fetchingSleeper, setFetchingSleeper] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshingSleeper, setRefreshingSleeper] = useState(false)
  const [refreshingYahoo, setRefreshingYahoo] = useState(false)

  // Load saved state and initialize draft
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/nfl-state")
        if (res.ok) {
          const data = await res.json()
          setSaved(data.state)
          if (data.state) {
            setDraftSeason(String(data.state.season))
            setDraftType(data.state.seasonType)
            setDraftWeek(String(data.state.week))
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Is the draft different from saved?
  const isDirty = saved
    ? draftSeason !== String(saved.season) ||
      draftType !== saved.seasonType ||
      draftWeek !== String(saved.week)
    : draftSeason !== "" || draftWeek !== ""

  // Discard draft changes, reset to saved
  const handleDiscard = () => {
    if (saved) {
      setDraftSeason(String(saved.season))
      setDraftType(saved.seasonType)
      setDraftWeek(String(saved.week))
    }
    setSleeperPreview(null)
  }

  // Save draft to DB
  const handleSave = async () => {
    const season = parseInt(draftSeason, 10)
    const week = parseInt(draftWeek, 10)
    if (!season || isNaN(week) || week < 1) {
      toast.error("Enter a valid season and week")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/nfl-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          state: {
            season,
            seasonType: draftType,
            week,
            displayWeek: week,
            leg: saved?.leg ?? 0,
            seasonStartDate: saved?.seasonStartDate ?? "",
            leagueSeason: String(season),
            previousSeason: saved?.previousSeason ?? "",
          },
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSaved(data.state)
      setSleeperPreview(null)
      toast.success("NFL state saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  // Fetch from Sleeper — preview only, does NOT persist
  const handleFetchSleeper = async () => {
    setFetchingSleeper(true)
    try {
      const res = await fetch("/api/admin/nfl-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch" }),
      })
      if (!res.ok) throw new Error()
      const { preview } = await res.json()
      setSleeperPreview(preview)
      toast.success("Fetched Sleeper state — review below, then use or save")
    } catch {
      toast.error("Failed to fetch from Sleeper")
    } finally {
      setFetchingSleeper(false)
    }
  }

  // Copy Sleeper preview values into draft (still doesn't save)
  const handleUseSleeperValues = () => {
    if (!sleeperPreview) return
    setDraftSeason(String(sleeperPreview.season))
    setDraftType(sleeperPreview.seasonType)
    setDraftWeek(String(sleeperPreview.week))
    setSleeperPreview(null)
  }

  // Advance — populates draft with next state (doesn't save)
  const handleAdvance = () => {
    if (!saved) return
    const next = getNextState(saved)
    setDraftSeason(String(next.season))
    setDraftType(next.seasonType)
    setDraftWeek(String(next.week))
  }

  // Refresh ADP
  const handleRefreshADP = async (source: "sleeper" | "yahoo") => {
    const setter = source === "sleeper" ? setRefreshingSleeper : setRefreshingYahoo
    setter(true)
    try {
      const endpoint =
        source === "sleeper"
          ? "/api/sleeper/adp?refresh=true"
          : "/api/yahoo/adp?refresh=true"
      const res = await fetch(endpoint)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed")
      }
      toast.success(`${source === "sleeper" ? "Sleeper" : "Yahoo"} ADP refreshed`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to refresh ADP")
    } finally {
      setter(false)
    }
  }

  const next = saved ? getNextState(saved) : null
  const draftMaxWeeks = MAX_WEEKS[draftType]

  return (
    <div className="max-w-2xl">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/nfl-data">NFL Data</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Manage</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold mb-1">Manage Data</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Advance the season, refresh ADP sources, and manage data imports
      </p>

      <Separator className="mb-6" />

      {/* ── NFL State ── */}
      <h2 className="text-lg font-semibold mb-3">NFL State</h2>
      <div className="border-3 border-border mb-8">
        {/* Editable fields — always visible, always the draft */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Season</span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <Select value={draftSeason} onValueChange={setDraftSeason}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Stage</span>
          {loading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <Select
              value={draftType}
              onValueChange={(v) => {
                const t = v as SeasonType
                setDraftType(t)
                if (parseInt(draftWeek, 10) > MAX_WEEKS[t]) {
                  setDraftWeek(String(MAX_WEEKS[t]))
                }
              }}
            >
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre">Pre-season</SelectItem>
                <SelectItem value="regular">Regular Season</SelectItem>
                <SelectItem value="post">Post-season</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Week</span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <Select value={draftWeek} onValueChange={setDraftWeek}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: draftMaxWeeks }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Week {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Read-only metadata from saved state */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Display Week</span>
          {loading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {saved?.displayWeek ?? "—"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Leg</span>
          {loading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {saved?.leg ?? "—"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Season Start</span>
          {loading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {saved?.seasonStartDate || "—"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">League Season</span>
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {saved?.leagueSeason || "—"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Previous Season</span>
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {saved?.previousSeason || "—"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Last Saved</span>
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <span className="text-xs text-muted-foreground font-mono">
              {saved?.updatedAt
                ? new Date(saved.updatedAt).toLocaleString()
                : "Never"}
            </span>
          )}
        </div>

        {/* Sleeper preview — only visible after fetching */}
        {sleeperPreview && (
          <div className="border-t-3 border-border">
            <div className="px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sleeper Reports
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Season</span>
              <span className="text-sm font-medium">{sleeperPreview.season}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Stage</span>
              <Badge variant="outline" className="text-xs">
                {STAGE_LABELS[sleeperPreview.seasonType]}
              </Badge>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Week</span>
              <span className="text-sm font-medium">{sleeperPreview.week}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Display Week</span>
              <span className="text-sm text-muted-foreground">{sleeperPreview.displayWeek}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Leg</span>
              <span className="text-sm text-muted-foreground">{sleeperPreview.leg}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Season Start</span>
              <span className="text-sm text-muted-foreground">{sleeperPreview.seasonStartDate || "—"}</span>
            </div>
            <div className="flex items-center justify-end px-4 py-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSleeperPreview(null)}>
                  Dismiss
                </Button>
                <Button variant="outline" size="sm" onClick={handleUseSleeperValues}>
                  Use These Values
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchSleeper}
              disabled={fetchingSleeper}
              className="gap-1.5"
            >
              <Download className={`h-3.5 w-3.5 ${fetchingSleeper ? "animate-pulse" : ""}`} />
              {fetchingSleeper ? "Fetching…" : "Fetch from Sleeper"}
            </Button>
            {saved && next && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvance}
                className="gap-1.5"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                {formatStateLabel(next)}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={handleDiscard}>
                Discard
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── ADP Sources ── */}
      <h2 className="text-lg font-semibold mb-3">ADP Sources</h2>
      <div className="border-3 border-border mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div>
            <span className="text-sm font-medium">Sleeper ADP</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Undocumented projections endpoint
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefreshADP("sleeper")}
            disabled={refreshingSleeper}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingSleeper ? "animate-spin" : ""}`} />
            {refreshingSleeper ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium">Yahoo ADP</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yahoo Fantasy API (requires OAuth)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefreshADP("yahoo")}
            disabled={refreshingYahoo}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingYahoo ? "animate-spin" : ""}`} />
            {refreshingYahoo ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ── Data Imports (placeholder) ── */}
      <h2 className="text-lg font-semibold mb-3">Data Imports</h2>
      <div className="border-3 border-border mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div>
            <span className="text-sm font-medium">Weekly Stats</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scrape and import last week&apos;s player stats
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div>
            <span className="text-sm font-medium">Roster Updates</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sync roster changes, injuries, and transactions
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium">Schedule</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Import game results and update schedule data
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Coming soon
          </Badge>
        </div>
      </div>
    </div>
  )
}
