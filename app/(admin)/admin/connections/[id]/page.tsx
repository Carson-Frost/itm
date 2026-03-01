"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { PuzzleEditor } from "../components/puzzle-editor"
import { toast } from "sonner"
import type { ConnectionsPuzzle, ConnectionsScheduleConfig } from "@/lib/types/connections"

export default function EditPuzzlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null)
  const [calendar, setCalendar] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [puzzleRes, scheduleRes] = await Promise.all([
          fetch(`/api/admin/connections/puzzles/${id}`),
          fetch("/api/admin/connections/schedule"),
        ])

        if (!puzzleRes.ok) throw new Error("Not found")
        setPuzzle(await puzzleRes.json())

        if (scheduleRes.ok) {
          const config: ConnectionsScheduleConfig = await scheduleRes.json()
          setCalendar(config.calendar)
        }
      } catch {
        toast.error("Failed to load puzzle")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div>
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Puzzle not found
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/connections">Connections</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Puzzle</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PuzzleEditor puzzle={puzzle} calendar={calendar} />
    </div>
  )
}
