"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Loader2, GraduationCap, User } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import type { CodenamesContentItem } from "@/lib/types/codenames"

type ContentType = "college" | "coach"

export default function CodenamesAdminPage() {
  const [items, setItems] = useState<CodenamesContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ContentType | "all">("all")

  // Add form
  const [name, setName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [type, setType] = useState<ContentType>("college")
  const [adding, setAdding] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<CodenamesContentItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      const typeParam = filter !== "all" ? `?type=${filter}` : ""
      const res = await fetch(`/api/admin/codenames/content${typeParam}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setItems(data.items)
    } catch {
      toast.error("Failed to load content")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    setAdding(true)
    try {
      const res = await fetch("/api/admin/codenames/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          imageUrl: imageUrl.trim() || null,
          type,
          subtitle: subtitle.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to add")
      toast.success(`${type === "college" ? "College team" : "Coach"} added`)
      setName("")
      setImageUrl("")
      setSubtitle("")
      fetchItems()
    } catch {
      toast.error("Failed to add item")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/codenames/content/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Deleted")
      setDeleteTarget(null)
      fetchItems()
    } catch {
      toast.error("Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 py-4">
                <Skeleton className="h-5 w-48 flex-1" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              {i < 4 && <Separator />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const colleges = items.filter((i) => i.type === "college")
  const coaches = items.filter((i) => i.type === "coach")
  const displayed = filter === "all" ? items : items.filter((i) => i.type === filter)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Codenames Content</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Content list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as ContentType | "all")}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({items.length})</SelectItem>
                  <SelectItem value="college">Colleges ({colleges.length})</SelectItem>
                  <SelectItem value="coach">Coaches ({coaches.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {displayed.length === 0 ? (
            <div className="border-3 border-dashed border-border py-16 text-center">
              <p className="text-muted-foreground text-sm">
                No content yet. Add college teams or coaches using the form.
              </p>
            </div>
          ) : (
            <div className="border-3 border-border">
              <div className="grid grid-cols-[1fr_100px_120px_50px] gap-4 px-4 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Name</span>
                <span>Type</span>
                <span>Subtitle</span>
                <span />
              </div>
              <Separator />

              {displayed.map((item, i) => (
                <div key={item.id}>
                  <div className="grid grid-cols-[1fr_100px_120px_50px] gap-4 px-4 py-3 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 object-cover bg-muted/50"
                        />
                      ) : (
                        <div className="h-8 w-8 shrink-0 bg-muted/50 flex items-center justify-center">
                          {item.type === "college" ? (
                            <GraduationCap className="size-4 text-muted-foreground" />
                          ) : (
                            <User className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </div>
                    <span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.type === "college" ? "College" : "Coach"}
                      </Badge>
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {item.subtitle || "\u2014"}
                    </span>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {i < displayed.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Add form */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="border-3 border-border">
            <div className="px-4 py-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Add Content</h3>
            </div>
            <Separator />
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college">College Team</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === "college" ? "e.g. Alabama Crimson Tide" : "e.g. Bill Belichick"}
                  autoComplete="off"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Subtitle</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={type === "college" ? "e.g. SEC" : "e.g. NE Patriots"}
                  autoComplete="off"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Image URL</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  autoComplete="off"
                />
              </div>

              <Button
                onClick={handleAdd}
                disabled={!name.trim() || adding}
                className="btn-chamfer w-full gap-2"
              >
                {adding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add {type === "college" ? "College Team" : "Coach"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
