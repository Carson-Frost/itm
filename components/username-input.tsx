"use client"

import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface UsernameInputProps {
  value: string
  onChange: (value: string) => void
  availability?: "checking" | "available" | "taken" | null
  className?: string
}

export function UsernameInput({ value, onChange, availability, className }: UsernameInputProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [validationState, setValidationState] = useState<"error" | "success" | "neutral" | null>(null)

  useEffect(() => {
    if (!value.trim()) {
      setValidationMessage(null)
      setValidationState(null)
      return
    }

    if (value.length < 3) {
      setValidationMessage("Too Short")
      setValidationState("error")
      return
    }

    if (value.length > 20) {
      setValidationMessage("Too Long")
      setValidationState("error")
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setValidationMessage("Invalid Characters")
      setValidationState("error")
      return
    }

    if (/^[_-]/.test(value) || /[_-]$/.test(value)) {
      setValidationMessage("Invalid Format")
      setValidationState("error")
      return
    }

    if (availability === "checking") {
      setValidationMessage("Checking...")
      setValidationState("neutral")
      return
    }

    if (availability === "taken") {
      setValidationMessage("Taken")
      setValidationState("error")
      return
    }

    if (availability === "available") {
      setValidationMessage("Available")
      setValidationState("success")
      return
    }

    setValidationMessage(null)
    setValidationState(null)
  }, [value, availability])

  const hasError = validationState === "error"
  const hasSuccess = validationState === "success"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Username</label>
        {validationMessage && (
          <span className={`text-xs ${
            validationState === "error" ? "text-destructive" :
            validationState === "success" ? "text-green-600" :
            "text-muted-foreground"
          }`}>
            {validationMessage}
          </span>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter username"
        className={`${
          hasError ? "border-destructive focus-visible:ring-destructive/20" :
          hasSuccess ? "border-green-500 focus-visible:ring-green-500/20" : ""
        } ${className || ""}`}
      />
    </div>
  )
}
