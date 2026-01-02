"use client"

import { useState } from "react"
import { toast } from "sonner"
import { changeUserPassword, validatePassword } from "@/lib/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ChangePasswordDialogProps {
  children?: React.ReactNode
}

export function ChangePasswordDialog({ children }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setError("")
    setSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required")
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "Invalid password")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    setSaving(true)
    try {
      await changeUserPassword(currentPassword, newPassword)
      toast.success("Password changed successfully")
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } catch (error: any) {
      console.error("Error changing password:", error)
      if (error.code === "auth/wrong-password") {
        setError("Current password is incorrect")
        toast.error("Current password is incorrect")
      } else if (error.code === "auth/requires-recent-login") {
        setError("Please sign out and sign back in before changing your password")
        toast.error("Please sign in again before changing password")
      } else {
        setError("Failed to change password. Please try again.")
        toast.error("Failed to change password")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Change</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update your account password
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Password changed successfully!</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
