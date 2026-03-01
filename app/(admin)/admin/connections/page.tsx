"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { buttonVariants } from "@/components/ui/button"
import { Loader2, Plus, X, RefreshCw, RotateCcw, Search, Check, Pencil } from "lucide-react"
import { toast } from "sonner"
import { ScheduleCalendar, Countdown } from "./components/schedule-calendar"
import { PuzzleStack } from "./components/puzzle-stack"
import { PuzzleList } from "./components/puzzle-list"
import { PuzzleCategoryStack } from "./components/puzzle-category-stack"
import type {
  ConnectionsScheduleConfig,
  ConnectionsPuzzle,
} from "@/lib/types/connections"

export default function ConnectionsPage() {
  const [config, setConfig] = useState<ConnectionsScheduleConfig | null>(null)
  const [puzzles, setPuzzles] = useState<ConnectionsPuzzle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Active puzzle edit dialog
  const [isActiveEditOpen, setIsActiveEditOpen] = useState(false)
  const [isOverrideOpen, setIsOverrideOpen] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<ConnectionsPuzzle | null>(null)

  // Fallback picker
  const [isFallbackOpen, setIsFallbackOpen] = useState(false)

  // Reset state
  const [resetUser, setResetUser] = useState<{ uid: string; username: string; email: string } | null>(null)
  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState<{ uid: string; username: string; email: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isResetUserOpen, setIsResetUserOpen] = useState(false)
  const [isResetAllOpen, setIsResetAllOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const [scheduleRes, puzzlesRes] = await Promise.all([
        fetch("/api/admin/connections/schedule"),
        fetch("/api/admin/connections/puzzles"),
      ])

      if (scheduleRes.ok) setConfig(await scheduleRes.json())
      if (puzzlesRes.ok) {
        const data = await puzzlesRes.json()
        setPuzzles(data.puzzles)
      }
    } catch {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // User search for reset
  useEffect(() => {
    if (!userSearch.trim()) {
      setUserResults([])
      setIsUserDropdownOpen(false)
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setUserResults(data.users.map((u: { uid: string; username: string; email: string }) => ({
            uid: u.uid,
            username: u.username,
            email: u.email,
          })))
          setIsUserDropdownOpen(true)
        }
      } catch {}
      setIsSearching(false)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [userSearch])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const saveConfig = async (updated: ConnectionsScheduleConfig) => {
    setConfig(updated)
    setSaving(true)
    try {
      const res = await fetch("/api/admin/connections/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleCalendarAssign = (date: string, puzzleId: string | null) => {
    if (!config) return
    const newCalendar = { ...config.calendar }
    if (puzzleId) {
      newCalendar[date] = puzzleId
    } else {
      delete newCalendar[date]
    }
    saveConfig({ ...config, calendar: newCalendar })
  }

  const handleStackChange = (stack: string[]) => {
    if (!config) return
    saveConfig({ ...config, stack })
  }

  const handleFallbackChange = (puzzleId: string | null) => {
    if (!config) return
    saveConfig({ ...config, fallbackPuzzleId: puzzleId })
    setIsFallbackOpen(false)
  }

  const todayKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })()

  const handleOverrideActive = (puzzle: ConnectionsPuzzle) => {
    setOverrideTarget(puzzle)
  }

  const confirmOverride = () => {
    if (!config || !overrideTarget) return
    const newCalendar = { ...config.calendar, [todayKey]: overrideTarget.id }
    saveConfig({ ...config, calendar: newCalendar })
    setOverrideTarget(null)
    setIsOverrideOpen(false)
    setIsActiveEditOpen(false)
  }

  const publishedPuzzles = puzzles.filter((p) => p.status === "published")

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!config) return null

  const activePuzzleId = config.calendar[todayKey]
  const activePuzzle = activePuzzleId
    ? puzzles.find((p) => p.id === activePuzzleId)
    : null

  const fallbackPuzzle = config.fallbackPuzzleId
    ? puzzles.find((p) => p.id === config.fallbackPuzzleId)
    : null

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Connections</h1>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          <Link href="/admin/connections/new">
            <Button className="btn-chamfer">
              <Plus className="h-4 w-4 mr-2" />
              New Puzzle
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Puzzle + Countdown row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Active Puzzle */}
        <div className="border-3 border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground">ACTIVE PUZZLE</p>
            <button
              onClick={() => setIsActiveEditOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          {activePuzzle ? (
            <PuzzleCategoryStack puzzle={activePuzzle} size="md" showAuthor />
          ) : (
            <p className="text-sm text-muted-foreground italic">No puzzle assigned for today</p>
          )}
        </div>

        {/* Countdown */}
        <Countdown />
      </div>

      {/* Calendar + Stack row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-8">
        {/* Calendar */}
        <div>
          <ScheduleCalendar
            calendar={config.calendar}
            puzzles={publishedPuzzles}
            onAssign={handleCalendarAssign}
          />
        </div>

        {/* Stack + Fallback */}
        <div className="flex flex-col gap-6">
          <PuzzleStack
            stack={config.stack}
            puzzles={publishedPuzzles}
            onChange={handleStackChange}
          />

          {/* Fallback */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">FALLBACK PUZZLE</p>
            {fallbackPuzzle ? (
              <div className="border-3 border-border p-3 flex items-start justify-between gap-2">
                <PuzzleCategoryStack puzzle={fallbackPuzzle} />
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsFallbackOpen(true)}
                  >
                    Change
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleFallbackChange(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-3 border-border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">No fallback set</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsFallbackOpen(true)}
                >
                  Set Fallback
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* All Puzzles List */}
      <PuzzleList puzzles={puzzles} calendar={config.calendar} />

      {/* ── DIALOGS ── */}

      {/* Active Puzzle Edit Dialog */}
      <Dialog open={isActiveEditOpen} onOpenChange={setIsActiveEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Active Puzzle</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Current active puzzle */}
            {activePuzzle ? (
              <div className="border-3 border-border p-3">
                <PuzzleCategoryStack puzzle={activePuzzle} size="md" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No puzzle assigned for today.</p>
            )}

            {/* Change active puzzle */}
            <Button
              variant="outline"
              onClick={() => setIsOverrideOpen(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Change Active Puzzle
            </Button>

            <Separator />

            {/* Reset Puzzle Data */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Reset Puzzle Data</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Clear play results for today&apos;s active puzzle.
              </p>

              {!activePuzzleId ? (
                <p className="text-xs text-muted-foreground">No active puzzle to reset.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Reset specific user */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      RESET SPECIFIC USER
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      {resetUser ? (
                        <div className="border-3 border-border p-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{resetUser.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{resetUser.email}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetUser(null)
                                setUserSearch("")
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={resetting}
                              onClick={() => setIsResetUserOpen(true)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Reset
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              placeholder="Search by username or email..."
                              autoComplete="off"
                              className="pl-9 text-sm"
                            />
                            {isSearching && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {isUserDropdownOpen && userResults.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 border-3 border-border bg-background max-h-48 overflow-y-auto">
                              {userResults.map((u) => (
                                <button
                                  key={u.uid}
                                  className="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors flex items-center gap-3"
                                  onClick={() => {
                                    setResetUser(u)
                                    setUserSearch("")
                                    setIsUserDropdownOpen(false)
                                  }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{u.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                  </div>
                                  <Check className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                          {isUserDropdownOpen && userSearch.trim() && !isSearching && userResults.length === 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 border-3 border-border bg-background px-3 py-3 text-xs text-muted-foreground text-center">
                              No users found
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Reset all users */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      RESET ALL USERS
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Clears every user&apos;s result for today&apos;s puzzle.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={resetting}
                      onClick={() => setIsResetAllOpen(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset All Users
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset user confirmation */}
      <AlertDialog open={isResetUserOpen} onOpenChange={setIsResetUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Puzzle Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the play result for{" "}
              <span className="font-semibold text-foreground">{resetUser?.username}</span>{" "}
              ({resetUser?.email}) on today&apos;s active puzzle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={resetting}
              onClick={async () => {
                if (!activePuzzleId || !resetUser) return
                setResetting(true)
                try {
                  const res = await fetch("/api/admin/connections/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      puzzleId: activePuzzleId,
                      uid: resetUser.uid,
                    }),
                  })
                  if (!res.ok) throw new Error("Reset failed")
                  const data = await res.json()
                  toast.success(`Reset ${data.resetCount} result(s) for ${resetUser.username}`)
                  setResetUser(null)
                  setUserSearch("")
                } catch {
                  toast.error("Failed to reset")
                } finally {
                  setResetting(false)
                  setIsResetUserOpen(false)
                }
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset all confirmation */}
      <AlertDialog open={isResetAllOpen} onOpenChange={setIsResetAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Puzzle Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete ALL play results for today&apos;s active
              puzzle across ALL users. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={resetting}
              onClick={async () => {
                if (!activePuzzleId) return
                setResetting(true)
                try {
                  const res = await fetch("/api/admin/connections/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ puzzleId: activePuzzleId }),
                  })
                  if (!res.ok) throw new Error("Reset failed")
                  const data = await res.json()
                  toast.success(`Reset ${data.resetCount} result(s) across all users`)
                } catch {
                  toast.error("Failed to reset")
                } finally {
                  setResetting(false)
                  setIsResetAllOpen(false)
                }
              }}
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fallback picker dialog */}
      <Dialog open={isFallbackOpen} onOpenChange={setIsFallbackOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Fallback Puzzle</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {publishedPuzzles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No published puzzles available
              </p>
            ) : (
              publishedPuzzles.map((puzzle) => (
                <button
                  key={puzzle.id}
                  className={`border-3 p-3 text-left transition-colors hover:bg-muted/20 ${
                    puzzle.id === config.fallbackPuzzleId
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => handleFallbackChange(puzzle.id)}
                >
                  <PuzzleCategoryStack puzzle={puzzle} />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active puzzle override picker */}
      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Active Puzzle</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {publishedPuzzles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No published puzzles available
              </p>
            ) : (
              publishedPuzzles
                .filter((p) => p.id !== config.calendar[todayKey])
                .map((puzzle) => (
                  <button
                    key={puzzle.id}
                    className="border-3 border-border p-3 text-left transition-colors hover:bg-muted/20"
                    onClick={() => handleOverrideActive(puzzle)}
                  >
                    <PuzzleCategoryStack puzzle={puzzle} />
                  </button>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Override confirmation */}
      <AlertDialog
        open={!!overrideTarget}
        onOpenChange={(open) => !open && setOverrideTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Active Puzzle</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately replace today&apos;s active puzzle.
              Players with an active session will see the new puzzle on refresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {overrideTarget && (
            <div className="border-3 border-border p-3">
              <PuzzleCategoryStack puzzle={overrideTarget} size="md" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmOverride}
              className="btn-chamfer"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
