"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Search, X, ChevronRight, User } from "lucide-react"
import { toast } from "sonner"

interface UserRow {
  uid: string
  email: string
  username: string
  createdAt: string | null
  lastLogin: string | null
  disabled: boolean
  rankingCount: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchUsers = async (pageToken?: string, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams()
      if (pageToken) params.set("pageToken", pageToken)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setUsers((prev) => [...prev, ...data.users])
        } else {
          setUsers(data.users)
        }
        setNextPageToken(data.nextPageToken)
      } else {
        toast.error("Failed to fetch users")
      }
    } catch {
      toast.error("Failed to fetch users")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [search])

  const handleSearch = () => {
    setSearch(searchInput)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Users</h1>
      <p className="text-sm text-muted-foreground mb-6">
        View and manage user accounts
      </p>

      <Separator className="mb-6" />

      {/* Search */}
      <div className="flex gap-2 mb-6 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by username or email..."
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
        {search && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearch("")
              setSearchInput("")
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Users table */}
      <div className="border-3 border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-3 border-border bg-muted/30">
              <th className="text-left px-4 py-2 font-semibold">User</th>
              <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">
                Email
              </th>
              <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">
                Joined
              </th>
              <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">
                Last Login
              </th>
              <th className="text-center px-4 py-2 font-semibold hidden md:table-cell">
                Rankings
              </th>
              <th className="text-center px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  </tr>
                ))
              : users.map((user) => (
                  <tr
                    key={user.uid}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[120px]">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground truncate max-w-[200px]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell tabular-nums">
                      {user.rankingCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.disabled ? (
                        <Badge variant="destructive" className="text-xs">
                          Disabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${user.uid}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No users found
          </div>
        )}
      </div>

      {/* Load more */}
      {nextPageToken && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => fetchUsers(nextPageToken, true)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}
