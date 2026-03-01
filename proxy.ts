import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || ""
  const isAdminSubdomain = host.startsWith("admin.")
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin")

  // In production use subdomain, in dev fall back to path-based routing
  const isAdmin =
    isAdminSubdomain ||
    (process.env.NODE_ENV === "development" && isAdminPath)

  if (isAdmin) {
    const url = req.nextUrl.clone()

    // Rewrite subdomain requests to /admin/* internally
    if (isAdminSubdomain && !url.pathname.startsWith("/admin")) {
      url.pathname = `/admin${url.pathname}`
    }

    // Allow the login page and login API through without session check
    if (
      url.pathname === "/admin-login" ||
      url.pathname === "/admin/login" ||
      url.pathname.startsWith("/api/admin/auth")
    ) {
      if (isAdminSubdomain) {
        return NextResponse.rewrite(url)
      }
      return NextResponse.next()
    }

    // Check for admin session cookie
    const session = req.cookies.get("admin-session")
    if (!session?.value) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = "/admin-login"
      return NextResponse.redirect(loginUrl)
    }

    if (isAdminSubdomain) {
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
