"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InfoTooltip } from "@/components/info-tooltip"

export type BaseOption = "sleeper-adp" | "itm"

interface BaseSelectorProps {
  value: BaseOption
  onChange: (value: BaseOption) => void
  disabled?: boolean
}

const baseOptions: { value: BaseOption; label: string; disabled?: boolean }[] = [
  { value: "sleeper-adp", label: "Sleeper ADP" },
  { value: "itm", label: "ITM Rankings", disabled: true },
]

export function BaseSelector({ value, onChange, disabled }: BaseSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">BASE</label>
        <InfoTooltip content="The starting point for your ranking. Choose a preset to begin with pre-populated players, or start with a blank board." />
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as BaseOption)} disabled={disabled}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {baseOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
              {opt.disabled && <span className="text-muted-foreground ml-1">(Soon)</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
