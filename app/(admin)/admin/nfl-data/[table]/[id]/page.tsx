"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Pencil, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Logical field ordering per table — most relevant first, grouped by category
const FIELD_ORDER: Record<string, string[]> = {
  roster_data: [
    // Identity
    "full_name", "first_name", "last_name", "football_name",
    // Photo
    "headshot_url",
    // Team & position
    "team", "position", "depth_chart_position", "ngs_position", "jersey_number", "status", "status_description_abbr",
    // Bio
    "birth_date", "height", "weight", "college", "years_exp",
    // Season context
    "season", "week", "game_type",
    // IDs
    "id", "gsis_id", "espn_id", "sportradar_id", "yahoo_id", "rotowire_id", "pff_id", "pfr_id", "fantasy_data_id", "sleeper_id", "esb_id",
  ],
  season_stats: [
    // Identity
    "player_display_name", "player_name", "player_id",
    "headshot_url",
    // Team & position
    "position", "position_group", "recent_team",
    // Context
    "season", "season_type", "games",
    // Passing
    "completions", "attempts", "passing_yards", "passing_tds", "passing_interceptions", "passing_air_yards", "passing_yards_after_catch", "passing_first_downs", "passing_epa", "passing_cpoe", "passing_2pt_conversions", "pacr",
    // Sacks
    "sacks_suffered", "sack_yards_lost", "sack_fumbles", "sack_fumbles_lost",
    // Rushing
    "carries", "rushing_yards", "rushing_tds", "rushing_fumbles", "rushing_fumbles_lost", "rushing_first_downs", "rushing_epa", "rushing_2pt_conversions",
    // Receiving
    "receptions", "targets", "receiving_yards", "receiving_tds", "receiving_fumbles", "receiving_fumbles_lost", "receiving_air_yards", "receiving_yards_after_catch", "receiving_first_downs", "receiving_epa", "receiving_2pt_conversions", "racr", "target_share", "air_yards_share", "wopr",
    // Other
    "special_teams_tds", "fantasy_points", "fantasy_points_ppr",
    // ID
    "id",
  ],
  weekly_stats: [
    // Identity
    "player_display_name", "player_name", "player_id",
    "headshot_url",
    // Team & position
    "position", "position_group", "team", "opponent_team",
    // Context
    "season", "week", "season_type",
    // Passing
    "completions", "attempts", "passing_yards", "passing_tds", "passing_interceptions", "passing_air_yards", "passing_yards_after_catch", "passing_first_downs", "passing_epa", "passing_cpoe", "passing_2pt_conversions", "pacr",
    // Sacks
    "sacks_suffered", "sack_yards_lost", "sack_fumbles", "sack_fumbles_lost",
    // Rushing
    "carries", "rushing_yards", "rushing_tds", "rushing_fumbles", "rushing_fumbles_lost", "rushing_first_downs", "rushing_epa", "rushing_2pt_conversions",
    // Receiving
    "receptions", "targets", "receiving_yards", "receiving_tds", "receiving_fumbles", "receiving_fumbles_lost", "receiving_air_yards", "receiving_yards_after_catch", "receiving_first_downs", "receiving_epa", "receiving_2pt_conversions", "racr", "target_share", "air_yards_share", "wopr",
    // Fantasy
    "fantasy_points", "fantasy_points_ppr",
    // ID
    "id",
  ],
  schedule_data: [
    // Game info
    "season", "week", "game_type", "gameday", "weekday", "gametime",
    // Teams & scores
    "away_team", "away_score", "home_team", "home_score", "result", "total", "overtime",
    // Venue
    "location", "stadium", "stadium_id", "roof", "surface", "temp", "wind",
    // QBs & coaches
    "away_qb_name", "away_qb_id", "home_qb_name", "home_qb_id", "away_coach", "home_coach", "referee",
    // Betting
    "spread_line", "away_spread_odds", "home_spread_odds", "total_line", "under_odds", "over_odds", "away_moneyline", "home_moneyline",
    // Rest
    "away_rest", "home_rest", "div_game",
    // IDs
    "game_id", "old_game_id", "gsis", "nfl_detail_id", "pfr", "pff", "espn", "ftn",
  ],
  sleeper_adp: [
    "player_name", "player_id", "headshot_url",
    "position", "team", "season",
    "adp_ppr", "adp_half_ppr", "adp_std",
    "updated_at", "id",
  ],
  metadata: ["key", "value"],
}

// Group labels for visual section breaks
const FIELD_GROUPS: Record<string, Record<string, string>> = {
  roster_data: {
    full_name: "Identity",
    headshot_url: "Photo",
    team: "Team & Position",
    birth_date: "Bio",
    season: "Season Context",
    id: "External IDs",
  },
  season_stats: {
    player_display_name: "Identity",
    headshot_url: "Photo",
    position: "Team & Position",
    season: "Context",
    completions: "Passing",
    sacks_suffered: "Sacks",
    carries: "Rushing",
    receptions: "Receiving",
    special_teams_tds: "Other",
    id: "ID",
  },
  weekly_stats: {
    player_display_name: "Identity",
    headshot_url: "Photo",
    position: "Team & Position",
    season: "Context",
    completions: "Passing",
    sacks_suffered: "Sacks",
    carries: "Rushing",
    receptions: "Receiving",
    fantasy_points: "Fantasy",
    id: "ID",
  },
  schedule_data: {
    season: "Game Info",
    away_team: "Teams & Scores",
    location: "Venue",
    away_qb_name: "QBs & Coaches",
    spread_line: "Betting Lines",
    away_rest: "Rest & Division",
    game_id: "External IDs",
  },
  sleeper_adp: {
    player_name: "Player",
    position: "Position & Team",
    adp_ppr: "ADP Values",
    updated_at: "Metadata",
  },
  metadata: {},
}

// Human-readable labels for column names
function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bQb\b/g, "QB")
    .replace(/\bTds\b/g, "TDs")
    .replace(/\bEpa\b/g, "EPA")
    .replace(/\bCpoe\b/g, "CPOE")
    .replace(/\bPpr\b/g, "PPR")
    .replace(/\bAdp\b/g, "ADP")
    .replace(/\bPfr\b/g, "PFR")
    .replace(/\bPff\b/g, "PFF")
    .replace(/\bEspn\b/g, "ESPN")
    .replace(/\bNfl\b/g, "NFL")
    .replace(/\bNgs\b/g, "NGS")
    .replace(/\bGsis\b/g, "GSIS")
    .replace(/\bFtn\b/g, "FTN")
    .replace(/\bEsb\b/g, "ESB")
    .replace(/\bStd\b/g, "STD")
    .replace(/\bFg\b/g, "FG")
    .replace(/\bPat\b/g, "PAT")
    .replace(/\bGwfg\b/g, "GWFG")
    .replace(/\bWopr\b/g, "WOPR")
    .replace(/\bRacr\b/g, "RACR")
    .replace(/\bPacr\b/g, "PACR")
}

function getRecordTitle(table: string, row: Record<string, unknown>): string {
  switch (table) {
    case "roster_data":
      return String(row.full_name || row.football_name || "Unknown Player")
    case "season_stats":
    case "weekly_stats":
      return String(row.player_display_name || row.player_name || "Unknown Player")
    case "schedule_data": {
      const away = row.away_team || "?"
      const home = row.home_team || "?"
      return `${away} @ ${home}`
    }
    case "sleeper_adp":
      return String(row.player_name || "Unknown Player")
    case "metadata":
      return String(row.key || "—")
    default:
      return "Record"
  }
}

function getRecordSubtitle(table: string, row: Record<string, unknown>): string | null {
  switch (table) {
    case "roster_data":
      return [row.position, row.team, row.season].filter(Boolean).join(" · ")
    case "season_stats":
      return [row.position, row.recent_team, row.season].filter(Boolean).join(" · ")
    case "weekly_stats":
      return [row.position, row.team, `Week ${row.week}`, row.season].filter(Boolean).join(" · ")
    case "schedule_data":
      return [`Week ${row.week}`, row.season, row.gameday].filter(Boolean).join(" · ")
    case "sleeper_adp":
      return [row.position, row.team, row.season].filter(Boolean).join(" · ")
    default:
      return null
  }
}

export default function RecordDetailPage({
  params,
}: {
  params: Promise<{ table: string; id: string }>
}) {
  const { table, id } = use(params)
  const decodedId = decodeURIComponent(id)
  const [row, setRow] = useState<Record<string, unknown> | null>(null)
  const [editableFields, setEditableFields] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchRecord() {
      try {
        const res = await fetch(
          `/api/admin/nfl-data?table=${table}&id=${encodeURIComponent(decodedId)}`
        )
        if (res.ok) {
          const data = await res.json()
          setRow(data.row)
          setEditableFields(data.editableFields)
        } else {
          toast.error("Record not found")
        }
      } catch {
        toast.error("Failed to load record")
      } finally {
        setLoading(false)
      }
    }

    fetchRecord()
  }, [table, decodedId])

  const handleStartFieldEdit = (field: string) => {
    setEditField(field)
    setEditValue(String(row?.[field] ?? ""))
  }

  const handleConfirmSave = () => {
    setConfirmEdit(true)
  }

  const handleSave = async () => {
    if (!row || !editField) return
    setSaving(true)

    try {
      const res = await fetch("/api/admin/nfl-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table,
          id: decodedId,
          field: editField,
          value: editValue,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Update failed")
      }

      const { row: updated } = await res.json()
      setRow(updated)
      setEditField(null)
      setConfirmEdit(false)
      toast.success(`${formatFieldLabel(editField)} updated. Change logged.`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Update failed"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Order fields logically
  const orderedFields = row ? getOrderedFields(table, row) : []
  const groups = FIELD_GROUPS[table] || {}
  const title = row ? getRecordTitle(table, row) : "Loading..."
  const subtitle = row ? getRecordSubtitle(table, row) : null
  const tableLabel = TABLES[table] || table

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/nfl-data">NFL Data</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/nfl-data?table=${table}`}>
              {tableLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{loading ? "Loading..." : title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !row ? (
        <p className="text-muted-foreground">Record not found</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-0.5">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>
          )}

          <Separator className="mb-6" />

          {/* Headshot preview if available */}
          {row.headshot_url && (
            <div className="mb-6">
              <img
                src={String(row.headshot_url)}
                alt=""
                className="h-20 w-20 border-3 border-border object-cover bg-muted"
              />
            </div>
          )}

          {/* Field listing */}
          <div className="border-3 border-border">
            {orderedFields.map((field, i) => {
              const groupLabel = groups[field]
              const isEditable = editableFields.includes(field)
              const isEditing = editField === field
              const val = row[field]

              return (
                <div key={field}>
                  {groupLabel && (
                    <div className={`px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i > 0 ? "border-t-3 border-border" : ""}`}>
                      {groupLabel}
                    </div>
                  )}
                  <div className="flex items-start gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground w-48 shrink-0 font-medium">
                      {formatFieldLabel(field)}
                    </span>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          autoComplete="off"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8 btn-chamfer text-primary-foreground"
                          onClick={handleConfirmSave}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => setEditField(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                        <span
                          className={`text-sm break-all ${
                            !isEditable ? "text-muted-foreground" : ""
                          }`}
                        >
                          {formatCellValue(val)}
                        </span>
                        {isEditable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleStartFieldEdit(field)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {editableFields.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Fields with a pencil icon can be edited. All changes are logged.
            </p>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmEdit} onOpenChange={setConfirmEdit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are changing{" "}
              <span className="font-semibold text-foreground">
                {editField ? formatFieldLabel(editField) : ""}
              </span>{" "}
              from{" "}
              <Badge variant="outline" className="mx-0.5 font-mono">
                {String(row?.[editField ?? ""] ?? "null")}
              </Badge>{" "}
              to{" "}
              <Badge variant="outline" className="mx-0.5 font-mono">
                {editValue}
              </Badge>
              . This will be logged under your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={saving}
              className="btn-chamfer text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Confirm Change"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const TABLES: Record<string, string> = {
  roster_data: "Roster Data",
  season_stats: "Season Stats",
  weekly_stats: "Weekly Stats",
  schedule_data: "Schedule",
  sleeper_adp: "Sleeper ADP",
  metadata: "Metadata",
}

function getOrderedFields(table: string, row: Record<string, unknown>): string[] {
  const order = FIELD_ORDER[table]
  if (!order) return Object.keys(row)

  const rowKeys = new Set(Object.keys(row))
  const ordered: string[] = []

  // Add fields in the defined order
  for (const field of order) {
    if (rowKeys.has(field)) {
      ordered.push(field)
      rowKeys.delete(field)
    }
  }

  // Add any remaining fields not in the order definition
  for (const field of rowKeys) {
    ordered.push(field)
  }

  return ordered
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "true" : "false"
  return String(val)
}
