"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { TriviaCategory } from "@/lib/types/trivia-draft"

export default function TriviaCategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<TriviaCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/games/trivia-categories?status=all")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setCategories(data.categories)
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 py-4">
                <Skeleton className="h-5 w-48 flex-1" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              {i < 4 && <Separator />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trivia Categories</h1>
        <Link href="/admin/trivia-categories/new">
          <Button className="btn-chamfer">
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="border-3 border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">
            No trivia categories yet.
          </p>
          <Link href="/admin/trivia-categories/new">
            <Button variant="outline" className="mt-4">
              Create your first category
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border-3 border-border">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1.5fr_80px_80px_120px] gap-4 px-4 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Name</span>
            <span>Description</span>
            <span>Status</span>
            <span className="text-right">Players</span>
            <span className="text-right">Created</span>
          </div>
          <Separator />

          {categories.map((cat, i) => (
            <div key={cat.id}>
              <button
                className="w-full text-left grid grid-cols-[1fr_1.5fr_80px_80px_120px] gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/trivia-categories/${cat.id}`)}
              >
                <span className="text-sm font-medium truncate">
                  {cat.name}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  {cat.description || "\u2014"}
                </span>
                <span>
                  {cat.status === "published" ? (
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Draft
                    </Badge>
                  )}
                </span>
                <span className="text-sm text-muted-foreground text-right tabular-nums">
                  {cat.validPlayers?.length ?? 0}
                </span>
                <span className="text-sm text-muted-foreground text-right tabular-nums">
                  {cat.createdAt
                    ? new Date(cat.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "\u2014"}
                </span>
              </button>
              {i < categories.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
