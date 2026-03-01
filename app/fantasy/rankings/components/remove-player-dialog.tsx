"use client"

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
import { buttonVariants } from "@/components/ui/button"

interface RemovePlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerName: string
  count?: number
  onConfirm: () => void
}

export function RemovePlayerDialog({ open, onOpenChange, playerName, count, onConfirm }: RemovePlayerDialogProps) {
  const isMulti = count !== undefined && count > 1

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from Board</AlertDialogTitle>
          <AlertDialogDescription>
            {isMulti
              ? `Are you sure you want to remove ${count} players from your ranking?`
              : `Are you sure you want to remove ${playerName} from your ranking?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={buttonVariants({ variant: "destructive" })}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
