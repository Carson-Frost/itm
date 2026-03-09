"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react"
import { toast } from "sonner"

const TABLES = [
  { value: "roster_data", label: "Roster Data" },
  { value: "season_stats", label: "Season Stats" },
  { value: "weekly_stats", label: "Weekly Stats" },
  { value: "schedule_data", label: "Schedule" },
  { value: "sleeper_adp", label: "Sleeper ADP" },
  { value: "yahoo_adp", label: "Yahoo ADP" },
  { value: "metadata", label: "Metadata" },
]

interface Column {
  name: string
  type: string
}

interface TableData {
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  columns: Column[]
  displayColumns: string[]
  filterColumns: string[]
  editableFields: string[]
  lastUpdated: string | null
}

// Human-readable column header labels
function formatColumnHeader(col: string): string {
  return col
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bPpr\b/g, "PPR")
    .replace(/\bAdp\b/g, "ADP")
    .replace(/\bStd\b/g, "STD")
    .replace(/\bId\b/g, "ID")
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bQb\b/g, "QB")
    .replace(/\bTds\b/g, "TDs")
    .replace(/\bEpa\b/g, "EPA")
}

export default function NflDataPage() {
  const [table, setTable] = useState("roster_data")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [data, setData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({})

  // Fetch filter options when table changes
  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch(`/api/admin/nfl-data?table=${table}&filters=true`)
        if (res.ok) {
          const data = await res.json()
          setFilterOptions(data.filters)
        }
      } catch {
        // non-critical
      }
    }
    setFilters({})
    setFilterOptions({})
    fetchFilters()
  }, [table])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        table,
        page: String(page),
        ...(sort && { sort, sortDir }),
        ...(search && { search }),
      })

      // Add active filters
      for (const [col, val] of Object.entries(filters)) {
        if (val) params.set(`filter_${col}`, val)
      }

      const res = await fetch(`/api/admin/nfl-data?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      toast.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }, [table, page, sort, sortDir, search, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page/sort when table changes
  useEffect(() => {
    setPage(1)
    setSort("")
    setSortDir("asc")
    setSearch("")
    setSearchInput("")
  }, [table])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSort = (col: string) => {
    if (sort === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSort(col)
      setSortDir("asc")
    }
    setPage(1)
  }

  const handleFilterChange = (col: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === "__all__") {
        delete next[col]
      } else {
        next[col] = value
      }
      return next
    })
  }

  const clearAllFilters = () => {
    setFilters({})
    setSearch("")
    setSearchInput("")
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || !!search

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0
  const displayColumns = data?.displayColumns || []
  const filterColumns = data?.filterColumns || []
  const pkCol = getPrimaryKey(table)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">NFL Data</h1>

      <Separator className="mb-6" />

      {/* Table selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABLES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search..."
              className="pl-10"
              autoComplete="off"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Column filters */}
      {filterColumns.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filterColumns.map((col) => {
            const options = filterOptions[col] || []
            if (options.length === 0) return null

            return (
              <Select
                key={col}
                value={filters[col] || "__all__"}
                onValueChange={(val) => handleFilterChange(col, val)}
              >
                <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
                  <SelectValue placeholder={formatColumnHeader(col)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    All {formatColumnHeader(col)}s
                  </SelectItem>
                  {options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          })}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={clearAllFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Info bar */}
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {data ? `${data.total.toLocaleString()} rows` : "Loading..."}
          </span>
          {data?.lastUpdated && (
            <span>Last updated: {data.lastUpdated}</span>
          )}
        </div>
        {data && totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border-3 border-border overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-3 border-border bg-muted/30">
              {displayColumns.map((col) => (
                <th
                  key={col}
                  className="text-left px-3 py-2 font-semibold whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {formatColumnHeader(col)}
                    {sort === col ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {displayColumns.map((col) => (
                    <td key={col} className="px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-4" />
                  </td>
                </tr>
              ))
            ) : data?.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length + 1}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No results found
                </td>
              </tr>
            ) : (
              data?.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  {displayColumns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 max-w-[200px] truncate"
                      title={String(row[col] ?? "")}
                    >
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/nfl-data/${table}/${encodeURIComponent(String(row[pkCol]))}`}
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="min-w-[36px]"
                onClick={() => setPage(p as number)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function getPrimaryKey(table: string): string {
  const keys: Record<string, string> = {
    roster_data: "id",
    season_stats: "id",
    weekly_stats: "id",
    schedule_data: "game_id",
    sleeper_adp: "id",
    yahoo_adp: "id",
    metadata: "key",
  }
  return keys[table] || "id"
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "true" : "false"
  return String(val)
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i)
  }
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}
