"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, X, Moon, ExternalLink, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Logo } from "@/components/logo"
import { useTheme } from "@/lib/theme-context"
import { toast } from "sonner"

interface AdminContextType {
  adminUid: string
  adminEmail: string
}

const AdminContext = createContext<AdminContextType>({
  adminUid: "",
  adminEmail: "",
})

export function useAdmin() {
  return useContext(AdminContext)
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/nfl-data", label: "NFL Data" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/connections", label: "Connections" },
  { href: "/admin/trivia-categories", label: "Trivia Draft" },
  { href: "/admin/settings", label: "Settings" },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [admin, setAdmin] = useState<AdminContextType | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch("/api/admin/auth/verify")
        if (!res.ok) {
          router.push("/admin-login")
          return
        }
        const data = await res.json()
        setAdmin({ adminUid: data.uid, adminEmail: data.email })
      } catch {
        router.push("/admin-login")
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" })
      toast.success("Logged out")
      router.push("/admin-login")
    } catch {
      toast.error("Logout failed")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <div className="w-56 border-r-3 border-border bg-secondary/10 p-4 hidden md:flex flex-col gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!admin) return null

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <AdminContext.Provider value={admin}>
      <div className="min-h-screen flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:sticky top-0 left-0 z-50 h-screen w-56
            border-r-3 border-border bg-background
            flex flex-col transition-transform duration-200
            md:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo asLink={false} className="text-lg" />
              <span className="text-sm text-muted-foreground font-medium tracking-wide">
                | Admin Panel
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          <nav className="flex-1 p-2 flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium
                    transition-colors
                    ${
                      active
                        ? "bg-primary/10 text-primary border-l-3 border-primary -ml-[3px] pl-[15px]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <Separator />

          <div className="p-3 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground truncate mb-1 px-1">
              {admin.adminEmail}
            </p>
            <div
              className="flex items-center justify-between px-2 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={toggleTheme}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Moon className="h-4 w-4" />
                Dark Mode
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
              </div>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              ITM Scouting
            </a>
            <button
              className="w-full text-left flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile topbar */}
          <div className="md:hidden flex items-center gap-3 p-3 border-b-3 border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Logo asLink={false} className="text-lg" />
              <span className="text-sm text-muted-foreground font-medium tracking-wide">
                | Admin Panel
              </span>
            </div>
          </div>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  )
}
