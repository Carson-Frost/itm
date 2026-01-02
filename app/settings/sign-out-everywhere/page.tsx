"use client"

import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { signOutEverywhere } from "@/lib/auth-actions"
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

export default function SignOutEverywhere() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  if (authLoading) return <LoadingSkeleton />
  if (!user) return null

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOutEverywhere()
      toast.success("Signed out everywhere")
    } catch {
      toast.error("Failed to sign out")
    } finally {
      setSigningOut(false)
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
                <BreadcrumbPage>Sign Out Everywhere</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Separator className="mb-5" />

          <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Sign Out Everywhere</h2>

          <div className="max-w-xl space-y-6">
            <div className="space-y-3">
              <p className="text-sm">
                This will sign you out of all devices and sessions where you are currently logged in.
              </p>
              <p className="text-sm text-muted-foreground">
                You will need to sign in again on this device and any other devices where you want to continue using your account.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "Signing out..." : "Sign Out Everywhere"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
