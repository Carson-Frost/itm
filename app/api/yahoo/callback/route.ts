import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { exchangeCodeForTokens } from '@/lib/yahoo-auth'

export async function GET(req: NextRequest) {
  // Verify admin session
  const token = req.cookies.get('admin-session')?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.redirect(new URL('/admin-login', req.url))
  }

  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    const errorDesc = req.nextUrl.searchParams.get('error_description') || 'Authorization denied'
    return NextResponse.redirect(
      new URL(`/admin/settings?yahoo_error=${encodeURIComponent(errorDesc)}`, req.url)
    )
  }

  try {
    const origin = req.nextUrl.origin
    const redirectUri = `${origin}/api/yahoo/callback`
    await exchangeCodeForTokens(code, redirectUri)

    return NextResponse.redirect(
      new URL('/admin/settings?yahoo_connected=true', req.url)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed'
    return NextResponse.redirect(
      new URL(`/admin/settings?yahoo_error=${encodeURIComponent(message)}`, req.url)
    )
  }
}
