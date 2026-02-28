"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UserRanking,
  ScoringFormat,
  RankingType,
  QBFormat,
} from "@/lib/types/ranking-schemas"

interface SettingsDialogProps {
  ranking: UserRanking
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: Partial<UserRanking>) => void
}

const scoringOptions: { value: ScoringFormat; label: string }[] = [
  { value: "PPR", label: "PPR" },
  { value: "Half", label: "Half PPR" },
  { value: "STD", label: "Standard" },
]

export function SettingsDialog({ ranking, open, onOpenChange, onSave }: SettingsDialogProps) {
  const [name, setName] = useState(ranking.name)
  const [type, setType] = useState<RankingType>(ranking.type ?? "redraft")
  const [scoring, setScoring] = useState<ScoringFormat>(ranking.scoring)
  const [qbFormat, setQbFormat] = useState<QBFormat>(ranking.qbFormat ?? "1qb")
  const [tePremium, setTePremium] = useState<number>(
    typeof ranking.tePremium === "number" ? ranking.tePremium : 0
  )

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(ranking.name)
      setType(ranking.type ?? "redraft")
      setScoring(ranking.scoring)
      setQbFormat(ranking.qbFormat ?? "1qb")
      setTePremium(typeof ranking.tePremium === "number" ? ranking.tePremium : 0)
    }
  }, [open, ranking])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      type,
      scoring,
      qbFormat,
      tePremium,
    })
    onOpenChange(false)
  }

  const hasChanges =
    name.trim() !== ranking.name ||
    type !== (ranking.type ?? "redraft") ||
    scoring !== ranking.scoring ||
    qbFormat !== (ranking.qbFormat ?? "1qb") ||
    tePremium !== (typeof ranking.tePremium === "number" ? ranking.tePremium : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ranking Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground">NAME</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ranking name"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">TYPE</label>
              <Select value={type} onValueChange={(v) => setType(v as RankingType)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="redraft">Redraft</SelectItem>
                  <SelectItem value="dynasty">Dynasty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">SCORING</label>
              <Select value={scoring} onValueChange={(v) => setScoring(v as ScoringFormat)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scoringOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">QBS</label>
              <Select value={qbFormat} onValueChange={(v) => setQbFormat(v as QBFormat)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1qb">1QB</SelectItem>
                  <SelectItem value="superflex">Superflex</SelectItem>
                  <SelectItem value="2qb">2QB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-[100px]">
            <label className="text-xs font-semibold text-muted-foreground">TE PREMIUM</label>
            <Select value={String(tePremium)} onValueChange={(v) => setTePremium(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="0.5">+0.5 PPR</SelectItem>
                <SelectItem value="1">+1 PPR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !hasChanges}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
