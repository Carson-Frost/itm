"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Save, Trash2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { PositionBadge } from "@/components/position-badge"
import { nflTeams } from "@/lib/team-utils"
import type {
  TriviaCategory,
  TriviaCategoryPlayer,
  TriviaCategoryFilter,
} from "@/lib/types/trivia-draft"

const POSITIONS = ["QB", "RB", "WR", "TE"] as const

interface CategoryEditorProps {
  category?: TriviaCategory
}

export function CategoryEditor({ category }: CategoryEditorProps) {
  const router = useRouter()
  const isEdit = !!category

  // Form state
  const [name, setName] = useState(category?.name ?? "")
  const [description, setDescription] = useState(category?.description ?? "")
  const [status, setStatus] = useState<"draft" | "published">(
    category?.status ?? "draft"
  )

  // Filter state
  const [positions, setPositions] = useState<string[]>(
    category?.filters?.positions ?? []
  )
  const [teams, setTeams] = useState<string[]>(
    category?.filters?.teams ?? []
  )
  const [colleges, setColleges] = useState<string[]>(
    category?.filters?.colleges ?? []
  )
  const [collegeInput, setCollegeInput] = useState("")
  const [seasonMin, setSeasonMin] = useState<string>(
    category?.filters?.seasonRange?.[0]?.toString() ?? ""
  )
  const [seasonMax, setSeasonMax] = useState<string>(
    category?.filters?.seasonRange?.[1]?.toString() ?? ""
  )
  const [minGames, setMinGames] = useState<string>(
    category?.filters?.minGames?.toString() ?? ""
  )
  const [minFantasyPointsPpr, setMinFantasyPointsPpr] = useState<string>(
    category?.filters?.minFantasyPointsPpr?.toString() ?? ""
  )
  const [minPassingYards, setMinPassingYards] = useState<string>(
    category?.filters?.minPassingYards?.toString() ?? ""
  )
  const [minRushingYards, setMinRushingYards] = useState<string>(
    category?.filters?.minRushingYards?.toString() ?? ""
  )
  const [minReceivingYards, setMinReceivingYards] = useState<string>(
    category?.filters?.minReceivingYards?.toString() ?? ""
  )
  const [minPassingTds, setMinPassingTds] = useState<string>(
    category?.filters?.minPassingTds?.toString() ?? ""
  )
  const [minRushingTds, setMinRushingTds] = useState<string>(
    category?.filters?.minRushingTds?.toString() ?? ""
  )
  const [minReceivingTds, setMinReceivingTds] = useState<string>(
    category?.filters?.minReceivingTds?.toString() ?? ""
  )

  // Team search
  const [teamSearch, setTeamSearch] = useState("")

  // Preview state
  const [previewPlayers, setPreviewPlayers] = useState<TriviaCategoryPlayer[]>(
    []
  )
  const [totalCount, setTotalCount] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Build query params from current filters
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (positions.length > 0) params.set("positions", positions.join(","))
    if (teams.length > 0) params.set("teams", teams.join(","))
    if (colleges.length > 0) params.set("colleges", colleges.join(","))
    if (seasonMin) params.set("seasonMin", seasonMin)
    if (seasonMax) params.set("seasonMax", seasonMax)
    if (minGames) params.set("minGames", minGames)
    if (minFantasyPointsPpr)
      params.set("minFantasyPointsPpr", minFantasyPointsPpr)
    if (minPassingYards) params.set("minPassingYards", minPassingYards)
    if (minRushingYards) params.set("minRushingYards", minRushingYards)
    if (minReceivingYards) params.set("minReceivingYards", minReceivingYards)
    if (minPassingTds) params.set("minPassingTds", minPassingTds)
    if (minRushingTds) params.set("minRushingTds", minRushingTds)
    if (minReceivingTds) params.set("minReceivingTds", minReceivingTds)
    params.set("limit", "200")
    return params.toString()
  }, [
    positions,
    teams,
    colleges,
    seasonMin,
    seasonMax,
    minGames,
    minFantasyPointsPpr,
    minPassingYards,
    minRushingYards,
    minReceivingYards,
    minPassingTds,
    minRushingTds,
    minReceivingTds,
  ])

  // Build filters object for saving
  const buildFiltersObject = useCallback((): TriviaCategoryFilter => {
    const filters: TriviaCategoryFilter = {}
    if (positions.length > 0) filters.positions = positions
    if (teams.length > 0) filters.teams = teams
    if (colleges.length > 0) filters.colleges = colleges
    if (seasonMin || seasonMax) {
      filters.seasonRange = [
        seasonMin ? parseInt(seasonMin) : 1970,
        seasonMax ? parseInt(seasonMax) : 2099,
      ]
    }
    if (minGames) filters.minGames = parseFloat(minGames)
    if (minFantasyPointsPpr)
      filters.minFantasyPointsPpr = parseFloat(minFantasyPointsPpr)
    if (minPassingYards) filters.minPassingYards = parseFloat(minPassingYards)
    if (minRushingYards) filters.minRushingYards = parseFloat(minRushingYards)
    if (minReceivingYards)
      filters.minReceivingYards = parseFloat(minReceivingYards)
    if (minPassingTds) filters.minPassingTds = parseFloat(minPassingTds)
    if (minRushingTds) filters.minRushingTds = parseFloat(minRushingTds)
    if (minReceivingTds) filters.minReceivingTds = parseFloat(minReceivingTds)
    return filters
  }, [
    positions,
    teams,
    colleges,
    seasonMin,
    seasonMax,
    minGames,
    minFantasyPointsPpr,
    minPassingYards,
    minRushingYards,
    minReceivingYards,
    minPassingTds,
    minRushingTds,
    minReceivingTds,
  ])

  // Fetch preview players (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const qs = buildFilterParams()
        const res = await fetch(
          `/api/games/trivia-categories/preview-players?${qs}`
        )
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        setPreviewPlayers(data.players)
        setTotalCount(data.totalCount)
      } catch {
        toast.error("Failed to load player preview")
      } finally {
        setPreviewLoading(false)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buildFilterParams])

  // Toggle position
  const togglePosition = (pos: string) => {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    )
  }

  // Add team
  const addTeam = (abbr: string) => {
    if (!teams.includes(abbr)) {
      setTeams((prev) => [...prev, abbr])
    }
    setTeamSearch("")
  }

  // Remove team
  const removeTeam = (abbr: string) => {
    setTeams((prev) => prev.filter((t) => t !== abbr))
  }

  // Add college
  const addCollege = () => {
    const trimmed = collegeInput.trim()
    if (trimmed && !colleges.includes(trimmed)) {
      setColleges((prev) => [...prev, trimmed])
    }
    setCollegeInput("")
  }

  // Remove college
  const removeCollege = (college: string) => {
    setColleges((prev) => prev.filter((c) => c !== college))
  }

  // Filtered teams for search
  const filteredTeams = nflTeams.filter(
    (t) =>
      !teams.includes(t.abbr) &&
      (teamSearch === "" ||
        t.abbr.toLowerCase().includes(teamSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        t.city.toLowerCase().includes(teamSearch.toLowerCase()))
  )

  // Save handler - fetches ALL matching players then saves
  const handleSave = async (saveStatus: "draft" | "published") => {
    if (!name.trim()) {
      toast.error("Category name is required")
      return
    }

    setSaving(true)
    try {
      // Fetch ALL matching players (no limit) for saving
      const qs = buildFilterParams().replace("limit=200", "limit=0")
      const playersRes = await fetch(
        `/api/games/trivia-categories/preview-players?${qs}`
      )
      if (!playersRes.ok) throw new Error("Failed to fetch players")
      const playersData = await playersRes.json()

      const body = {
        name: name.trim(),
        description: description.trim(),
        status: saveStatus,
        validPlayers: playersData.players,
        filters: buildFiltersObject(),
      }

      let res: Response
      if (isEdit && category) {
        res = await fetch(`/api/games/trivia-categories/${category.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/games/trivia-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Save failed")
      }

      toast.success(
        isEdit
          ? "Category updated"
          : saveStatus === "published"
            ? "Category published"
            : "Category saved as draft"
      )
      router.push("/admin/trivia-categories")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save category"
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete handler
  const handleDelete = async () => {
    if (!category) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/games/trivia-categories/${category.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Category deleted")
      router.push("/admin/trivia-categories")
    } catch {
      toast.error("Failed to delete category")
    } finally {
      setDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      {/* Left: Form */}
      <div className="flex flex-col gap-6">
        {/* Category details */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Details
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="cat-name" className="text-sm font-medium mb-1.5 block">
                Name
              </Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Top Fantasy QBs 2020-2024"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-sm font-medium mb-1.5 block">
                Description
              </Label>
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this category..."
                autoComplete="off"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "draft" | "published")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        {/* Filters */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Filters
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            All filters are optional. When no filters are set, all players with
            fantasy stats are included.
          </p>

          <div className="flex flex-col gap-5">
            {/* Positions */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Positions
              </Label>
              <div className="flex gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    className={`
                      px-3 py-1.5 text-sm font-medium border-3 transition-colors
                      ${
                        positions.includes(pos)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }
                    `}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Teams */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Teams</Label>
              {teams.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {teams.map((abbr) => {
                    const team = nflTeams.find((t) => t.abbr === abbr)
                    return (
                      <Badge
                        key={abbr}
                        variant="outline"
                        className="gap-1 pr-1"
                      >
                        {team ? `${abbr} ${team.name}` : abbr}
                        <button
                          type="button"
                          onClick={() => removeTeam(abbr)}
                          className="ml-0.5 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              <Input
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Search teams..."
                autoComplete="off"
                className="mb-1"
              />
              {teamSearch && filteredTeams.length > 0 && (
                <div className="border-3 border-border max-h-40 overflow-y-auto">
                  {filteredTeams.slice(0, 10).map((t) => (
                    <button
                      key={t.abbr}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors"
                      onClick={() => addTeam(t.abbr)}
                    >
                      <span className="font-medium">{t.abbr}</span>
                      <span className="text-muted-foreground ml-2">
                        {t.city} {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colleges */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Colleges
              </Label>
              {colleges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {colleges.map((college) => (
                    <Badge
                      key={college}
                      variant="outline"
                      className="gap-1 pr-1"
                    >
                      {college}
                      <button
                        type="button"
                        onClick={() => removeCollege(college)}
                        className="ml-0.5 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={collegeInput}
                  onChange={(e) => setCollegeInput(e.target.value)}
                  placeholder="Type a college name and press Add"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addCollege()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCollege}
                  disabled={!collegeInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Season range */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Season Range
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={seasonMin}
                  onChange={(e) => setSeasonMin(e.target.value)}
                  placeholder="From"
                  autoComplete="off"
                  className="w-28"
                />
                <span className="text-muted-foreground text-sm">&ndash;</span>
                <Input
                  type="number"
                  value={seasonMax}
                  onChange={(e) => setSeasonMax(e.target.value)}
                  placeholder="To"
                  autoComplete="off"
                  className="w-28"
                />
              </div>
            </div>

            {/* Minimum stats */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Minimum Stats
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Games Played
                  </label>
                  <Input
                    type="number"
                    value={minGames}
                    onChange={(e) => setMinGames(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Fantasy Points (PPR)
                  </label>
                  <Input
                    type="number"
                    value={minFantasyPointsPpr}
                    onChange={(e) => setMinFantasyPointsPpr(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Passing Yards
                  </label>
                  <Input
                    type="number"
                    value={minPassingYards}
                    onChange={(e) => setMinPassingYards(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Rushing Yards
                  </label>
                  <Input
                    type="number"
                    value={minRushingYards}
                    onChange={(e) => setMinRushingYards(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Receiving Yards
                  </label>
                  <Input
                    type="number"
                    value={minReceivingYards}
                    onChange={(e) => setMinReceivingYards(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Passing TDs
                  </label>
                  <Input
                    type="number"
                    value={minPassingTds}
                    onChange={(e) => setMinPassingTds(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Rushing TDs
                  </label>
                  <Input
                    type="number"
                    value={minRushingTds}
                    onChange={(e) => setMinRushingTds(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Receiving TDs
                  </label>
                  <Input
                    type="number"
                    value={minReceivingTds}
                    onChange={(e) => setMinReceivingTds(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Actions */}
        <section className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save as Draft
          </Button>
          <Button
            className="btn-chamfer"
            onClick={() => handleSave("published")}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Publish
          </Button>
          {isEdit && (
            <Button
              variant="outline"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </section>
      </div>

      {/* Right: Player preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="border-3 border-border">
          <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Valid Players</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {previewLoading ? (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              ) : (
                <>
                  {totalCount.toLocaleString()} total
                  {totalCount > 200 && (
                    <span className="ml-1">(showing 200)</span>
                  )}
                </>
              )}
            </span>
          </div>
          <Separator />

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {previewLoading && previewPlayers.length === 0 ? (
              <div className="flex flex-col gap-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2">
                    <Skeleton className="h-8 w-8 shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : previewPlayers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No players match the current filters.
                </p>
              </div>
            ) : (
              previewPlayers.map((player, i) => (
                <div key={`${player.playerId}-${player.season}-${i}`}>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="h-8 w-8 shrink-0 overflow-hidden bg-muted/50">
                      {player.headshotUrl ? (
                        <img
                          src={player.headshotUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {player.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <PositionBadge position={player.position} />
                        <span className="text-xs text-muted-foreground">
                          {player.team}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          &middot; {player.season}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {player.fantasyPointsPpr.toFixed(1)} pts
                    </span>
                  </div>
                  {i < previewPlayers.length - 1 && <Separator />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{name || "this category"}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
