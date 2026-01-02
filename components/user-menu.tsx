"use client"

import Link from "next/link"
import { Moon, Settings, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { useUserData } from "@/hooks/use-user-data"
import { signOut } from "@/lib/auth-actions"
import { AuthDialog } from "@/components/auth-dialog"
import { UserAvatar } from "@/components/user-avatar"
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

export function UserMenu() {
  const { user, loading } = useAuth()
  const { userData } = useUserData(user?.uid)
  const { theme, toggleTheme } = useTheme()

  if (loading) {
    return null
  }

  if (!user) {
    return <AuthDialog />
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        className="[&>svg]:hidden h-11 pl-4 pr-2"
        onClick={(e) => {
          if (e.currentTarget.getAttribute('data-state') === 'open') {
            e.preventDefault()
          }
        }}
      >
        <span className="mr-3 text-base">{userData?.username || user.displayName || user.email}</span>
        <UserAvatar
          username={userData?.username}
          avatarConfig={userData?.avatarConfig}
          className="h-8 w-8"
        />
      </NavigationMenuTrigger>
      <NavigationMenuContent className="left-auto right-0">
        <ul className="grid w-[250px] px-2 pt-2 pb-1">
          <li className="flex items-center gap-2 pb-3 border-b mb-2">
            <UserAvatar
              username={userData?.username}
              avatarConfig={userData?.avatarConfig}
              className="h-8 w-8"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{userData?.username || "User"}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </li>
          <li className="mb-1">
            <div
              className="flex items-center justify-between px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
              onClick={toggleTheme}
            >
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span>Dark Mode</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
              </div>
            </div>
          </li>
          <li className="mb-1">
            <Link href="/settings" className="flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </li>
          <li className="border-t mt-2 pt-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm px-2 h-auto py-2 gap-2"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </li>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}
