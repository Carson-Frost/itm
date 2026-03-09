import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { isYahooConnected, clearTokens } from '@/lib/yahoo-auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin-session')?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    isConnected: isYahooConnected(),
    isConfigured: !!(process.env.YAHOO_CLIENT_ID && process.env.YAHOO_CLIENT_SECRET),
  })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin-session')?.value
  const admin = await verifyAdminSession(token)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  clearTokens()
  return NextResponse.json({ success: true })
}
