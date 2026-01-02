"use client"

import { useState } from "react"
import { toast } from "sonner"
import { deleteUserAccount } from "@/lib/auth-actions"
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

interface DeleteAccountDialogProps {
  userId: string
  children?: React.ReactNode
}

export function DeleteAccountDialog({ userId, children }: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [password, setPassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    setError("")

    if (!password) {
      setError("Password is required")
      return
    }

    setShowConfirmation(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteUserAccount(password)
      toast.success("Account deleted successfully")
      // User will be automatically signed out and redirected
    } catch (error: any) {
      console.error("Error deleting account:", error)
      setShowConfirmation(false)
      if (error.code === "auth/wrong-password") {
        setError("Password is incorrect")
        toast.error("Password is incorrect")
      } else if (error.code === "auth/requires-recent-login") {
        setError("Please sign out and sign back in before deleting your account")
        toast.error("Please sign in again before deleting account")
      } else {
        setError("Failed to delete account. Please try again.")
        toast.error("Failed to delete account")
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || <Button variant="destructive">Delete</Button>}
        </DialogTrigger>

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Confirm Your Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
