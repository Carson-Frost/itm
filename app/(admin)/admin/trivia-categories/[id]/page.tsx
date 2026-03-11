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
import { toast } from "sonner"
import { CategoryEditor } from "../components/category-editor"
import type { TriviaCategory } from "@/lib/types/trivia-draft"

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [category, setCategory] = useState<TriviaCategory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategory() {
      try {
        const res = await fetch(`/api/games/trivia-categories/${id}`)
        if (!res.ok) throw new Error("Not found")
        setCategory(await res.json())
      } catch {
        toast.error("Failed to load category")
      } finally {
        setLoading(false)
      }
    }
    fetchCategory()
  }, [id])

  if (loading) {
    return (
      <div>
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Category not found
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/trivia-categories">Trivia Categories</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{category.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold mb-6">{category.name}</h1>

      <CategoryEditor category={category} />
    </div>
  )
}
