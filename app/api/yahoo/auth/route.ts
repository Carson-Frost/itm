import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth'

export async function GET(req: NextRequest) {
  // Only admins can initiate Yahoo OAuth
  const token = req.cookies.get('admin-session')?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.YAHOO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Yahoo OAuth not configured' }, { status: 500 })
  }

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/yahoo/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    language: 'en-us',
  })

  return NextResponse.redirect(`${YAHOO_AUTH_URL}?${params}`)
}
