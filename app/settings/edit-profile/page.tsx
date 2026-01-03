"use client"

import { useAuth } from "@/lib/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { Navbar } from "@/components/navbar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles } from "lucide-react"
import { updateUserProfile, checkUsernameAvailable } from "@/lib/auth-actions"
import { randomizeAvatarConfig, defaultAvatarConfig, type AvatarConfig } from "@/lib/avatar-utils"
import { UsernameInput } from "@/components/username-input"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type Availability = "checking" | "available" | "taken" | null

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

export default function EditProfile() {
  const { user, loading: authLoading } = useAuth()
  const { userData, loading: dataLoading } = useUserData(user?.uid)
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [initialUsername, setInitialUsername] = useState("")
  const [avatar, setAvatar] = useState<AvatarConfig>(defaultAvatarConfig)
  const [initialAvatar, setInitialAvatar] = useState<AvatarConfig>(defaultAvatarConfig)
  const [availability, setAvailability] = useState<Availability>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (userData && !username) {
      const name = userData.username || user?.displayName || ""
      const config = userData.avatarConfig || defaultAvatarConfig
      setUsername(name)
      setInitialUsername(name)
      setAvatar(config)
      setInitialAvatar(config)
    }
  }, [userData, user, username])

  useEffect(() => {
    const isValid = username.trim() &&
                    username !== initialUsername &&
                    username.length >= 3 &&
                    /^[a-zA-Z0-9_-]+$/.test(username)

    if (!isValid) {
      setAvailability(null)
      return
    }

    const timeout = setTimeout(async () => {
      setAvailability("checking")
      try {
        const available = await checkUsernameAvailable(username.trim(), user!.uid)
        setAvailability(available ? "available" : "taken")
      } catch {
        setAvailability(null)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [username, initialUsername, user])

  if (authLoading || dataLoading) return <LoadingSkeleton />
  if (!user || !userData) return null

  const usernameChanged = username.trim() !== initialUsername
  const avatarChanged = JSON.stringify(avatar) !== JSON.stringify(initialAvatar)
  const hasChanges = usernameChanged || avatarChanged
  const canSave = hasChanges &&
                  !saving &&
                  (!usernameChanged || (availability !== "taken" && availability !== "checking"))

  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    try {
      await updateUserProfile(user.uid, username.trim(), avatarChanged ? avatar : undefined)
      toast.success("Profile updated")
      router.push("/settings")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => router.push("/settings")
  const randomize = () => setAvatar(randomizeAvatarConfig())

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
                <BreadcrumbPage>Edit Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Separator className="mb-5" />

          <h1 className="text-2xl sm:text-3xl font-bold mb-6 underline">Edit Profile</h1>

          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <UserAvatar
                username={username}
                avatarConfig={avatar}
                className="h-24 w-24"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={randomize}
                className="h-7 text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Randomize
              </Button>
            </div>

            <div className="flex-1 max-w-xs flex flex-col justify-end h-[133px]">
              <div className="space-y-4">
                <UsernameInput
                  value={username}
                  onChange={setUsername}
                  availability={availability}
                />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!canSave}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
