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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  X,
  RefreshCw,
  RotateCcw,
  Search,
  Check,
  Plus,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { CommandStrip } from "./components/command-strip"
import { ScheduleCalendar } from "./components/schedule-calendar"
import { PuzzleStack } from "./components/puzzle-stack"
import { PuzzleList } from "./components/puzzle-list"
import { PuzzleCategoryStack } from "./components/puzzle-category-stack"
import type {
  ConnectionsScheduleConfig,
  ConnectionsPuzzle,
} from "@/lib/types/connections"

type PickerTarget =
  | { type: "today" }
  | { type: "on-deck" }
  | { type: "calendar"; date: string }

export default function ConnectionsPage() {
  const [config, setConfig] = useState<ConnectionsScheduleConfig | null>(null)
  const [puzzles, setPuzzles] = useState<ConnectionsPuzzle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Management dialogs
  const [managementDialog, setManagementDialog] = useState<"today" | "on-deck" | null>(null)

  // Puzzle picker
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)

  // Override confirmation (when changing today's active puzzle)
  const [overrideTarget, setOverrideTarget] = useState<ConnectionsPuzzle | null>(null)

  // Remove today confirmation
  const [isRemoveTodayOpen, setIsRemoveTodayOpen] = useState(false)

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

  const todayKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })()

  const tomorrowKey = (() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`
  })()

  // Picker: user selected a puzzle from the full list
  const handlePickerSelect = (puzzle: ConnectionsPuzzle) => {
    if (!pickerTarget || !config) return

    let dateKey: string
    if (pickerTarget.type === "today") {
      dateKey = todayKey
    } else if (pickerTarget.type === "on-deck") {
      dateKey = tomorrowKey
    } else {
      dateKey = pickerTarget.date
    }

    // If replacing today's active puzzle, need confirmation + reset
    if (dateKey === todayKey && activePuzzle) {
      setOverrideTarget(puzzle)
      setPickerTarget(null)
    } else {
      handleCalendarAssign(dateKey, puzzle.id)
      setPickerTarget(null)
    }
  }

  // Override confirmation: change today's active puzzle
  const confirmOverride = async () => {
    if (!config || !overrideTarget) return
    const oldPuzzleId = activePuzzle?.id
    const newCalendar = { ...config.calendar, [todayKey]: overrideTarget.id }
    await saveConfig({ ...config, calendar: newCalendar })

    // Reset play data for the old puzzle so it becomes reusable
    if (oldPuzzleId) {
      try {
        await fetch("/api/admin/connections/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puzzleId: oldPuzzleId }),
        })
      } catch {
        toast.error("Failed to reset old puzzle data")
      }
    }

    setOverrideTarget(null)
  }

  // Remove today's puzzle confirmation
  const confirmRemoveToday = () => {
    handleCalendarAssign(todayKey, null)
    setIsRemoveTodayOpen(false)
    setManagementDialog(null)
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

  // Compute today's active puzzle: calendar → backlog[stackPointer]
  const { activePuzzle, activeSource } = (() => {
    const calendarId = config.calendar[todayKey]
    if (calendarId) {
      const p = puzzles.find((pz) => pz.id === calendarId)
      if (p) return { activePuzzle: p, activeSource: "calendar" as const }
    }
    const pointer = config.stackPointer ?? 0
    if (config.stack.length > pointer) {
      const p = puzzles.find((pz) => pz.id === config.stack[pointer])
      if (p) return { activePuzzle: p, activeSource: "backlog" as const }
    }
    return { activePuzzle: null, activeSource: null }
  })()

  // Compute tomorrow's puzzle: calendar → backlog[0]
  const { tomorrowPuzzle, tomorrowSource } = (() => {
    const calendarId = config.calendar[tomorrowKey]
    if (calendarId) {
      const p = puzzles.find((pz) => pz.id === calendarId)
      if (p) return { tomorrowPuzzle: p, tomorrowSource: "calendar" as const }
    }
    if (config.stack.length > 0) {
      const p = puzzles.find((pz) => pz.id === config.stack[0])
      if (p) return { tomorrowPuzzle: p, tomorrowSource: "backlog" as const }
    }
    return { tomorrowPuzzle: null, tomorrowSource: null }
  })()

  // For on-deck: can only "remove" if it's a calendar assignment
  const tomorrowIsCalendar = tomorrowSource === "calendar"

  // For today: can only "remove" if it's a calendar assignment
  const todayIsCalendar = activeSource === "calendar"

  // Dialog puzzle context
  const dialogPuzzle = managementDialog === "today" ? activePuzzle : tomorrowPuzzle
  const dialogSource = managementDialog === "today" ? activeSource : tomorrowSource
  const dialogIsCalendar = managementDialog === "today" ? todayIsCalendar : tomorrowIsCalendar

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Connections</h1>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
        <Link href="/admin/connections/new">
          <Button className="btn-chamfer">
            <Plus className="h-4 w-4 mr-2" />
            New Puzzle
          </Button>
        </Link>
      </div>

      {/* ── Command Strip ── */}
      <CommandStrip
        activePuzzle={activePuzzle}
        activeSource={activeSource}
        tomorrowPuzzle={tomorrowPuzzle}
        tomorrowSource={tomorrowSource}
        onEditActive={() => setManagementDialog("today")}
        onEditOnDeck={() => setManagementDialog("on-deck")}
      />

      {/* ── Tabbed Content ── */}
      <Tabs defaultValue="schedule" className="mt-6">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="all-puzzles">Puzzles</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <ScheduleCalendar
              calendar={config.calendar}
              puzzles={publishedPuzzles}
              onAssign={handleCalendarAssign}
              onRequestChange={(date) => setPickerTarget({ type: "calendar", date })}
            />

            <div className="flex flex-col h-full">
              <p className="text-xs font-semibold text-muted-foreground mb-2">BACKLOG</p>
              <PuzzleStack
                stack={config.stack}
                puzzles={publishedPuzzles}
                onChange={handleStackChange}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="all-puzzles" className="mt-2">
          <PuzzleList puzzles={puzzles} calendar={config.calendar} stack={config.stack} stackPointer={config.stackPointer ?? 0} />
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════
          DIALOGS
          ═══════════════════════════════════════════════════════ */}

      {/* ── Today / On Deck Management Dialog ── */}
      <Dialog open={!!managementDialog} onOpenChange={(open) => !open && setManagementDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {managementDialog === "today" ? "Today's Puzzle" : "On Deck"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Puzzle info block */}
            {dialogPuzzle ? (
              <div className="border-3 border-border p-3">
                <PuzzleCategoryStack puzzle={dialogPuzzle} />
              </div>
            ) : (
              <div className="border-3 border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {managementDialog === "today"
                    ? "No puzzle scheduled for today"
                    : "No puzzle scheduled for tomorrow"}
                </p>
              </div>
            )}

            {/* Actions */}
            {dialogPuzzle ? (
              <div className="flex flex-col gap-2">
                <Link href={`/admin/connections/${dialogPuzzle.id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Edit Puzzle
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const target = managementDialog === "today"
                      ? { type: "today" as const }
                      : { type: "on-deck" as const }
                    setManagementDialog(null)
                    setPickerTarget(target)
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Change Puzzle
                </Button>
                {dialogIsCalendar && (
                  <Button
                    variant="outline"
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      if (managementDialog === "today") {
                        setIsRemoveTodayOpen(true)
                      } else {
                        handleCalendarAssign(tomorrowKey, null)
                        setManagementDialog(null)
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Puzzle
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="btn-chamfer"
                onClick={() => {
                  const target = managementDialog === "today"
                    ? { type: "today" as const }
                    : { type: "on-deck" as const }
                  setManagementDialog(null)
                  setPickerTarget(target)
                }}
              >
                Assign Puzzle
              </Button>
            )}

            {/* Reset section — only for today's puzzle */}
            {managementDialog === "today" && dialogPuzzle && (
              <>
                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-1">Reset Puzzle Data</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Clear play results for today&apos;s active puzzle.
                  </p>

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
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove Today Confirmation ── */}
      <AlertDialog open={isRemoveTodayOpen} onOpenChange={setIsRemoveTodayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Today&apos;s Puzzle</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove the active puzzle. Players will see an error until a new puzzle is assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmRemoveToday}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Puzzle Picker Dialog ── */}
      <Dialog open={!!pickerTarget} onOpenChange={(open) => !open && setPickerTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Puzzle</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <PuzzleList
              puzzles={publishedPuzzles}
              calendar={config.calendar}
              stack={config.stack}
              stackPointer={config.stackPointer ?? 0}
              onSelect={handlePickerSelect}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Override Confirmation (changing today's active puzzle) ── */}
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
              All play data for the current puzzle will be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {overrideTarget && (
            <div className="border-3 border-border p-3">
              <PuzzleCategoryStack puzzle={overrideTarget} />
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

      {/* ── Reset User Confirmation ── */}
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
                if (!activePuzzle || !resetUser) return
                setResetting(true)
                try {
                  const res = await fetch("/api/admin/connections/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      puzzleId: activePuzzle.id,
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

      {/* ── Reset All Confirmation ── */}
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
                if (!activePuzzle) return
                setResetting(true)
                try {
                  const res = await fetch("/api/admin/connections/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ puzzleId: activePuzzle.id }),
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
    </div>
  )
}
