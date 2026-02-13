"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Plus, Folder, Trash2 } from "lucide-react"
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { AuthDialog } from "@/components/auth-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { DeleteDialog } from "./components/delete-dialog"
import { PositionBadge } from "@/components/position-badge"
import { ScoringBadge, QBFormatBadge, TEPremiumBadge } from "@/components/format-badge"
import { UserRanking, RankingType, ScoringFormat } from "@/lib/types/ranking-schemas"

type TypeFilter = "all" | RankingType
type ScoringFilter = "all" | ScoringFormat

export default function FantasyRankings() {
  const { user, loading: authLoading } = useAuth()
  const [rankings, setRankings] = useState<UserRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [scoringFilter, setScoringFilter] = useState<ScoringFilter>("all")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRanking | null>(null)

  useEffect(() => {
    async function fetchRankings() {
      if (!user) {
        setRankings([])
        setLoading(false)
        return
      }

      try {
        const rankingsRef = collection(db, "users", user.uid, "rankings")
        const q = query(rankingsRef, orderBy("updatedAt", "desc"))
        const snapshot = await getDocs(q)

        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as UserRanking[]

        setRankings(data)
      } catch {
        // Handle silently
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchRankings()
    }
  }, [user, authLoading])

  const filteredRankings = useMemo(() => {
    let filtered = rankings

    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.type === typeFilter)
    }

    if (scoringFilter !== "all") {
      filtered = filtered.filter((r) => r.scoring === scoringFilter)
    }

    return filtered
  }, [rankings, typeFilter, scoringFilter])

  const handleDeleteClick = (ranking: UserRanking) => {
    setDeleteTarget(ranking)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!user || !deleteTarget) return

    try {
      await deleteDoc(doc(db, "users", user.uid, "rankings", deleteTarget.id))
      setRankings((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    } catch {
      // Handle silently
    } finally {
      setDeleteOpen(false)
      setDeleteTarget(null)
    }
  }

  const formatDate = (timestamp: { toDate?: () => Date } | undefined) => {
    return timestamp?.toDate?.()
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(timestamp.toDate())
      : ""
  }

  const hasFilters = typeFilter !== "all" || scoringFilter !== "all"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 underline">Fantasy Rankings</h1>

          {authLoading || loading ? (
            <RankingsSkeleton />
          ) : !user ? (
            <SignedOutState />
          ) : rankings.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="flex items-end gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">TYPE</label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="redraft">Redraft</SelectItem>
                      <SelectItem value="dynasty">Dynasty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">SCORING</label>
                  <Select value={scoringFilter} onValueChange={(v) => setScoringFilter(v as ScoringFilter)}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PPR">PPR</SelectItem>
                      <SelectItem value="Half">Half PPR</SelectItem>
                      <SelectItem value="STD">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button asChild size="lg" className="ml-auto">
                  <Link href="/fantasy/rankings/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ranking
                  </Link>
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableBody>
                    {hasFilters && filteredRankings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No rankings match your filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRankings.map((ranking) => (
                        <TableRow key={ranking.id} className="group">
                          <TableCell>
                            <Link
                              href={`/fantasy/rankings/${ranking.id}`}
                              className="text-base font-semibold hover:underline"
                            >
                              {ranking.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {/* Type */}
                              <span className="text-xs font-medium text-muted-foreground">
                                {ranking.type === "dynasty" ? "Dynasty" : "Redraft"}
                              </span>

                              {/* Format badges */}
                              <div className="flex items-center gap-1">
                                <ScoringBadge scoring={ranking.scoring} />
                                <QBFormatBadge qbFormat={ranking.qbFormat} />
                                <TEPremiumBadge tePremium={ranking.tePremium} />
                              </div>

                              {/* Position badges */}
                              {ranking.positions && ranking.positions.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {ranking.positions.map((pos) => (
                                    <PositionBadge key={pos} position={pos} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right align-middle">
                            <div className="text-xs text-muted-foreground">
                              Updated {formatDate(ranking.updatedAt)}
                            </div>
                            <div className="text-xs text-muted-foreground/60 mt-0.5">
                              Created {formatDate(ranking.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="w-10 align-middle">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteClick(ranking)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </main>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        rankingName={deleteTarget?.name || ""}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

function RankingsSkeleton() {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableBody>
          {[...Array(4)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-5 w-40 mb-2" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right">
                <Skeleton className="h-3.5 w-24 ml-auto" />
                <Skeleton className="h-3.5 w-20 ml-auto mt-1.5" />
              </TableCell>
              <TableCell className="w-10" />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SignedOutState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Folder className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium mb-2">Sign in to get started</h2>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Create and manage your own fantasy football rankings for redraft and dynasty leagues.
      </p>
      <AuthDialog />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium mb-2">No rankings yet</h2>
      <Button asChild className="mt-4">
        <Link href="/fantasy/rankings/create">
          <Plus className="h-4 w-4 mr-2" />
          Create Ranking
        </Link>
      </Button>
    </div>
  )
}
