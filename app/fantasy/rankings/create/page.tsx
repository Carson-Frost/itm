"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronDown, Check } from "lucide-react"
import { collection, addDoc, Timestamp, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  UserRanking,
  FantasyPosition,
  ScoringFormat,
  RankingType,
  QBFormat,
  TeamFilter,
  RankedPlayer,
  SleeperADP,
} from "@/lib/types/ranking-schemas"
import { nflTeams, nflDivisions, nflConferences, teamMatchesFilter } from "@/lib/team-utils"
import { cn } from "@/lib/utils"
import { BaseSelector, BaseOption } from "@/components/base-selector"
import { PositionBadge } from "@/components/position-badge"
import { ScoringBadge, QBFormatBadge, TEPremiumBadge } from "@/components/format-badge"

const allPositions: FantasyPosition[] = ["QB", "RB", "WR", "TE"]

const NAME_MIN_LENGTH = 3
const NAME_MAX_LENGTH = 50

const CURRENT_YEAR = new Date().getFullYear()
const MIN_DRAFT_YEAR = 2010
const MAX_DRAFT_YEAR = CURRENT_YEAR + 1
const MIN_AGE = 20
const MAX_AGE = 45

export default function CreateRanking() {
  const { user } = useAuth()
  const router = useRouter()

  // Form state
  const [name, setName] = useState("")
  const [type, setType] = useState<RankingType>("redraft")
  const [scoring, setScoring] = useState<ScoringFormat>("PPR")
  const [qbFormat, setQbFormat] = useState<QBFormat>("1qb")
  const [tePremium, setTePremium] = useState<number>(0)
  const [positions, setPositions] = useState<FantasyPosition[]>(["QB", "RB", "WR", "TE"])
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("ALL")
  const [ageRange, setAgeRange] = useState<[number, number]>([MIN_AGE, MAX_AGE])
  const [draftClassRange, setDraftClassRange] = useState<[number, number]>([MIN_DRAFT_YEAR, MAX_DRAFT_YEAR])
  const [base, setBase] = useState<BaseOption>("sleeper-adp")

  // Positions dropdown state
  const [positionsOpen, setPositionsOpen] = useState(false)

  // Data state
  const [loading, setLoading] = useState(false)
  const [existingRankings, setExistingRankings] = useState<UserRanking[]>([])

  // Name validation
  const [nameValidation, setNameValidation] = useState<{
    message: string | null
    state: "error" | "success" | null
  }>({ message: null, state: null })

  // Validate name
  useEffect(() => {
    if (!name.trim()) {
      setNameValidation({ message: null, state: null })
      return
    }

    if (name.length < NAME_MIN_LENGTH) {
      setNameValidation({ message: "Too Short", state: "error" })
      return
    }

    if (name.length > NAME_MAX_LENGTH) {
      setNameValidation({ message: "Too Long", state: "error" })
      return
    }

    const isDuplicate = existingRankings.some(
      (r) => r.name.toLowerCase() === name.trim().toLowerCase()
    )
    if (isDuplicate) {
      setNameValidation({ message: "Name Taken", state: "error" })
      return
    }

    setNameValidation({ message: "Available", state: "success" })
  }, [name, existingRankings])

  // Fetch existing rankings
  useEffect(() => {
    async function fetchRankings() {
      if (!user) return

      try {
        const rankingsRef = collection(db, "users", user.uid, "rankings")
        const q = query(rankingsRef, orderBy("updatedAt", "desc"))
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserRanking[]
        setExistingRankings(data)
      } catch {
        // Handle silently
      }
    }

    fetchRankings()
  }, [user])

  const togglePosition = (pos: FantasyPosition) => {
    setPositions((prev) => {
      if (prev.includes(pos)) {
        if (prev.length === 1) return prev
        return prev.filter((p) => p !== pos)
      }
      return [...prev, pos]
    })
  }

  const canCreate = name.trim().length >= NAME_MIN_LENGTH &&
    nameValidation.state !== "error" &&
    positions.length > 0

  // Fetch players from base and create ranking
  const handleCreate = async () => {
    if (!user || !canCreate) return

    setLoading(true)
    try {
      const response = await fetch('/api/sleeper/adp')
      if (!response.ok) {
        throw new Error('Failed to fetch ADP data')
      }

      const { adp } = await response.json() as { adp: SleeperADP[] }

      // Filter by position and team
      let filteredPlayers = adp.filter((player) =>
        positions.includes(player.position as FantasyPosition)
      )

      if (teamFilter !== "ALL") {
        filteredPlayers = filteredPlayers.filter((player) =>
          teamMatchesFilter(player.team, teamFilter)
        )
      }

      // Sort by ADP for selected scoring format
      filteredPlayers.sort((a, b) => {
        if (scoring === "PPR") return a.adp_ppr - b.adp_ppr
        if (scoring === "Half") return a.adp_half_ppr - b.adp_half_ppr
        return a.adp_std - b.adp_std
      })

      const players: RankedPlayer[] = filteredPlayers.map((player, index) => ({
        rank: index + 1,
        playerId: player.player_id,
        name: player.player_name,
        position: player.position as FantasyPosition,
        team: player.team,
        headshotUrl: player.headshot_url || undefined,
      }))

      const now = Timestamp.now()
      const rankingsRef = collection(db, "users", user.uid, "rankings")

      const docRef = await addDoc(rankingsRef, {
        name: name.trim(),
        type,
        positions,
        teamFilter,
        ageRange,
        draftClassRange,
        scoring,
        qbFormat,
        tePremium,
        createdAt: now,
        updatedAt: now,
        players,
      })

      router.push(`/fantasy/rankings/${docRef.id}`)
    } catch {
      // Handle silently
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/fantasy/rankings")
  }

  if (!user) {
    router.push("/fantasy/rankings")
    return null
  }

  const getTeamFilterLabel = (value: string) => {
    if (value === "ALL") return "All Teams"
    if (nflConferences.includes(value as typeof nflConferences[number])) return value
    if (nflDivisions.includes(value as typeof nflDivisions[number])) return value
    return value
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/fantasy/rankings">Fantasy Rankings</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Create Ranking</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-2xl sm:text-3xl font-bold mb-6 underline">Create Ranking</h1>

          <div className="space-y-4">
            {/* Name + Base */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5 w-full max-w-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">NAME</label>
                  {nameValidation.message && (
                    <span
                      className={cn(
                        "text-xs",
                        nameValidation.state === "error"
                          ? "text-destructive"
                          : "text-green-600"
                      )}
                    >
                      {nameValidation.message}
                    </span>
                  )}
                </div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Fantasy Ranking"
                  maxLength={NAME_MAX_LENGTH}
                  autoComplete="off"
                  className={cn(
                    nameValidation.state === "error" &&
                      "border-destructive focus-visible:ring-destructive/20",
                    nameValidation.state === "success" &&
                      "border-green-500 focus-visible:ring-green-500/20"
                  )}
                />
              </div>

              <BaseSelector value={base} onChange={setBase} />
            </div>

            {/* League format */}
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">TYPE</label>
                <Select value={type} onValueChange={(v) => setType(v as RankingType)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redraft">Redraft</SelectItem>
                    <SelectItem value="dynasty">Dynasty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">SCORING</label>
                <Select value={scoring} onValueChange={(v) => setScoring(v as ScoringFormat)}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue>
                      <ScoringBadge scoring={scoring} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PPR">
                      <ScoringBadge scoring="PPR" />
                    </SelectItem>
                    <SelectItem value="Half">
                      <ScoringBadge scoring="Half" />
                    </SelectItem>
                    <SelectItem value="STD">
                      <ScoringBadge scoring="STD" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">QB FORMAT</label>
                <Select value={qbFormat} onValueChange={(v) => setQbFormat(v as QBFormat)}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue>
                      <QBFormatBadge qbFormat={qbFormat} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1qb">
                      <QBFormatBadge qbFormat="1qb" />
                    </SelectItem>
                    <SelectItem value="superflex">
                      <QBFormatBadge qbFormat="superflex" />
                    </SelectItem>
                    <SelectItem value="2qb">
                      <QBFormatBadge qbFormat="2qb" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">TE PREMIUM</label>
                <Select value={String(tePremium)} onValueChange={(v) => setTePremium(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue>
                      <TEPremiumBadge tePremium={tePremium} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">
                      <TEPremiumBadge tePremium={0} />
                    </SelectItem>
                    <SelectItem value="0.5">
                      <TEPremiumBadge tePremium={0.5} />
                    </SelectItem>
                    <SelectItem value="1">
                      <TEPremiumBadge tePremium={1} />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Positions + Team */}
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">POSITIONS</label>
                <Popover open={positionsOpen} onOpenChange={setPositionsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[180px] justify-between font-normal"
                    >
                      <div className="flex items-center gap-1">
                        {positions.map((pos) => (
                          <PositionBadge key={pos} position={pos} />
                        ))}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-1" align="start">
                    {allPositions.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => togglePosition(pos)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded border border-transparent hover:border-ring hover:ring-ring/50 hover:ring-[3px]"
                      >
                        <div className={cn(
                          "h-4 w-4 border rounded flex items-center justify-center",
                          positions.includes(pos) ? "bg-primary border-primary" : "border-input"
                        )}>
                          {positions.includes(pos) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <PositionBadge position={pos} />
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">TEAM</label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue>{getTeamFilterLabel(teamFilter)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[400px]">
                    <SelectItem value="ALL">All Teams</SelectItem>
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">Conferences</SelectLabel>
                      {nflConferences.map((conf) => (
                        <SelectItem key={conf} value={conf}>{conf}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">Divisions</SelectLabel>
                      {nflDivisions.map((div) => (
                        <SelectItem key={div} value={div}>{div}</SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">Teams</SelectLabel>
                      {nflTeams.sort((a, b) => a.abbr.localeCompare(b.abbr)).map((team) => (
                        <SelectItem key={team.abbr} value={team.abbr}>{team.abbr}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Age + Draft Class sliders */}
            <div className="grid grid-cols-2 gap-4 max-w-[400px]">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">AGE</label>
                <Slider
                  value={ageRange}
                  onValueChange={(v) => setAgeRange([v[0], v[1]])}
                  min={MIN_AGE}
                  max={MAX_AGE}
                  step={1}
                />
                <span className="text-xs text-muted-foreground">
                  {ageRange[0]} – {ageRange[1]}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">DRAFT CLASS</label>
                <Slider
                  value={draftClassRange}
                  onValueChange={(v) => setDraftClassRange([v[0], v[1]])}
                  min={MIN_DRAFT_YEAR}
                  max={MAX_DRAFT_YEAR}
                  step={1}
                />
                <span className="text-xs text-muted-foreground">
                  {draftClassRange[0]} – {draftClassRange[1]}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !canCreate}>
              {loading ? "Creating..." : "Create Ranking"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
