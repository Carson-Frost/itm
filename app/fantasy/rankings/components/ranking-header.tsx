"use client"

import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { UserRanking } from "@/lib/types/ranking-schemas"
import { PositionBadge } from "@/components/position-badge"
import { ScoringBadge, QBFormatBadge, TEPremiumBadge } from "@/components/format-badge"

interface RankingHeaderProps {
  ranking: UserRanking
}

export function RankingHeader({ ranking }: RankingHeaderProps) {
  return (
    <div className="mb-3">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/fantasy/rankings">Fantasy Rankings</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{ranking.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold">{ranking.name}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <span className="text-sm font-medium text-muted-foreground">
            {ranking.type === "dynasty" ? "Dynasty" : "Redraft"}
          </span>
          <div className="flex items-center gap-1">
            <ScoringBadge scoring={ranking.scoring} />
            <QBFormatBadge qbFormat={ranking.qbFormat} />
            <TEPremiumBadge tePremium={ranking.tePremium} />
          </div>
          {ranking.positions && ranking.positions.length > 0 && (
            <div className="flex items-center gap-1">
              {ranking.positions.map((pos) => (
                <PositionBadge key={pos} position={pos} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
