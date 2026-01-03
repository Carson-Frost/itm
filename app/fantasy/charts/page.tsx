"use client"

import { useState, useMemo, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Filters } from "./components/filters"
import { PlayerTable } from "./components/player-table"
import { Pagination } from "./components/pagination"
import { TableSkeleton } from "./components/table-skeleton"
import { Position, Player } from "@/lib/mock-fantasy-data"
import { SeasonStatsResponse } from "@/app/api/fantasy/season-stats/route"

type SortField = 'rank' | 'fantasyPoints' | 'pointsPerGame'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 15

export default function Charts() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [availableSeasons, setAvailableSeasons] = useState<{ year: number; label: string }[]>([])
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch data from API
  useEffect(() => {
    // Don't fetch until we have a season selected
    if (selectedSeason === null) return

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          season: selectedSeason.toString(),
        })

        const response = await fetch(`/api/fantasy/season-stats?${params}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Failed to fetch season stats')
        }

        const data: SeasonStatsResponse = await response.json()

        setAllPlayers(data.players)
      } catch (err) {
        console.error('Error fetching season stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setAllPlayers([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedSeason])

  // Initial load to get available seasons and set default
  useEffect(() => {
    async function getSeasons() {
      try {
        const response = await fetch('/api/fantasy/season-stats')
        if (response.ok) {
          const data: SeasonStatsResponse = await response.json()
          if (data.availableSeasons.length > 0) {
            setSelectedSeason(data.availableSeasons[0])
            setAvailableSeasons(
              data.availableSeasons.map((year) => ({
                year,
                label: year.toString(),
              }))
            )
          }
        }
      } catch (err) {
        console.error('Error fetching available seasons:', err)
      }
    }

    getSeasons()
  }, [])

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = allPlayers

    // Filter by position
    if (selectedPosition !== 'ALL') {
      filtered = filtered.filter((p) => p.position === selectedPosition)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.team.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    return sorted
  }, [allPlayers, selectedPosition, searchQuery, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPlayers.length / ITEMS_PER_PAGE)

  // Auto-clamp currentPage to valid range when filters change
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages))

  const paginatedPlayers = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredAndSortedPlayers.slice(startIndex, endIndex)
  }, [filteredAndSortedPlayers, validCurrentPage])

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Handle filter changes
  const handlePositionChange = (position: Position | 'ALL') => {
    setSelectedPosition(position)
    setCurrentPage(1)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleSeasonChange = (season: number) => {
    setSelectedSeason(season)
    setCurrentPage(1)
  }

  // Placeholder for player detail view
  const handlePlayerClick = (player: Player) => {
    // TODO: Implement player detail view
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 underline">Fantasy Charts</h1>

          <div className="space-y-4">
            <Filters
              selectedPosition={selectedPosition}
              onPositionChange={handlePositionChange}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              selectedSeason={selectedSeason}
              onSeasonChange={handleSeasonChange}
              availableSeasons={availableSeasons}
            />

            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <p className="text-lg font-semibold">Error loading data</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
            ) : filteredAndSortedPlayers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No players found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <PlayerTable
                  players={paginatedPlayers}
                  selectedPosition={selectedPosition}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onPlayerClick={handlePlayerClick}
                />

                <Pagination
                  currentPage={validCurrentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedPlayers.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
