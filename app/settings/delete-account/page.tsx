"use client"

import { useAuth } from "@/lib/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { Navbar } from "@/components/navbar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { deleteUserAccount } from "@/lib/auth-actions"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <Skeleton className="h-5 w-48 mb-4" />
          <Separator className="mb-5" />
          <Skeleton className="h-6 w-32 mb-4 pb-2 border-b" />
          <Skeleton className="h-24 w-full max-w-md" />
        </div>
      </main>
    </div>
  )
}

export default function DeleteAccount() {
  const { user, loading: authLoading } = useAuth()
  const { userData, loading: dataLoading } = useUserData(user?.uid)
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  if (authLoading || dataLoading) return <LoadingSkeleton />
  if (!user || !userData) return null

  const isPasswordAuth = user.providerData[0]?.providerId === "password"
  const canDelete = confirmation === userData.username && (!isPasswordAuth || password.length > 0)

  const handleDelete = async () => {
    if (!canDelete) return

    setDeleting(true)
    try {
      await deleteUserAccount(password)
      toast.success("Account deleted")
      router.push("/")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => router.push("/settings")

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/settings">Settings</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Delete Account</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Separator className="mb-5" />

          <h1 className="text-2xl sm:text-3xl font-bold mb-6 underline">Delete Account</h1>

          <div className="max-w-xl space-y-6">
            <div className="flex gap-3 p-4 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">This action cannot be undone</p>
                <p className="text-sm text-muted-foreground">
                  Deleting your account will permanently remove all of your data from our servers.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">What will be deleted:</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Your profile and account information</li>
                <li>All saved data and preferences</li>
                <li>Your username will become available for others to use</li>
              </ul>
            </div>

            <div className="space-y-4 pt-2">
              {isPasswordAuth && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm your password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type '{userData.username}' to confirm</label>
                <Input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
