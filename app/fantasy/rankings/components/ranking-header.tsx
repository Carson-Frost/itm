"use client"

import Link from "next/link"
import { Check, Loader2, Undo2, Redo2 } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserRanking, ScoringFormat } from "@/lib/types/ranking-schemas"
import { SettingsDialog } from "./settings-dialog"

interface RankingHeaderProps {
  ranking: UserRanking
  saveStatus: "saved" | "saving" | "error"
  onSettingsSave: (updates: Partial<UserRanking>) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

const scoringLabels: Record<ScoringFormat, string> = {
  PPR: "PPR",
  Half: "Half PPR",
  STD: "Standard",
}

export function RankingHeader({
  ranking,
  saveStatus,
  onSettingsSave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: RankingHeaderProps) {
  // Build position display string
  const positionDisplay = ranking.positions?.length
    ? ranking.positions.length === 4
      ? "All"
      : ranking.positions.join("/")
    : "All"

  return (
    <div className="mb-6">
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

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold truncate">{ranking.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={ranking.type === "dynasty" ? "default" : "outline"}>
              {ranking.type === "dynasty" ? "Dynasty" : "Redraft"}
            </Badge>
            <Badge variant="outline">{positionDisplay}</Badge>
            <Badge variant="secondary">{scoringLabels[ranking.scoring]}</Badge>
            {ranking.qbFormat === "superflex" && <Badge variant="outline">SF</Badge>}
            {ranking.qbFormat === "2qb" && <Badge variant="outline">2QB</Badge>}
            {ranking.tePremium === 0.5 && <Badge variant="outline">TEP+</Badge>}
            {ranking.tePremium === 1 && <Badge variant="outline">TEP++</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="hidden sm:inline">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <span className="text-destructive">Error</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          <SettingsDialog ranking={ranking} onSave={onSettingsSave} />
        </div>
      </div>
    </div>
  )
}
