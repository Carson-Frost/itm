"use client"

import { useAuth } from "@/lib/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { Navbar } from "@/components/navbar"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight } from "lucide-react"

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-6 w-20 mb-4" />
          <Skeleton className="h-16 w-full max-w-md" />
        </div>
      </main>
    </div>
  )
}

function SettingsRow({
  onClick,
  children,
  disabled = false,
}: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`flex items-center justify-between gap-4 py-2 -mx-3 px-3 sm:-mx-6 sm:px-6 rounded-sm ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent/50"
      } transition-colors`}
    >
      {children}
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </div>
  )
}

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 pb-2 border-b">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth()
  const { userData, loading: dataLoading } = useUserData(user?.uid)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  if (authLoading || dataLoading) return <LoadingSkeleton />
  if (!user || !userData) return null

  const isPasswordAuth = user.providerData[0]?.providerId === "password"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 underline">Settings</h1>

          <div className="space-y-6">
            <SettingsSection title="Profile">
              <SettingsRow onClick={() => router.push("/settings/edit-profile")}>
                <UserAvatar
                  username={userData.username}
                  avatarConfig={userData.avatarConfig}
                  className="h-12 w-12 sm:h-16 sm:w-16"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{userData.username || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Account">
              {isPasswordAuth && (
                <ChangePasswordDialog>
                  <SettingsRow>
                    <p className="font-medium text-sm">Change Password</p>
                  </SettingsRow>
                </ChangePasswordDialog>
              )}

              <SettingsRow onClick={() => router.push("/settings/sign-out-everywhere")}>
                <p className="font-medium text-sm">Sign Out Everywhere</p>
              </SettingsRow>

              <SettingsRow onClick={() => router.push("/settings/delete-account")}>
                <p className="font-medium text-destructive text-sm">Delete Account</p>
              </SettingsRow>
            </SettingsSection>
          </div>
        </div>
      </main>
    </div>
  )
}
