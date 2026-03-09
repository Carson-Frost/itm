import { getDatabase } from '@/lib/database/connection'

const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'

interface YahooTokens {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp ms
}

/**
 * Get stored Yahoo OAuth tokens from the metadata table
 */
export function getStoredTokens(): YahooTokens | null {
  const db = getDatabase()

  try {
    const row = db.prepare("SELECT value FROM metadata WHERE key = 'yahoo_tokens'").get() as { value: string } | undefined
    if (!row?.value) return null
    return JSON.parse(row.value) as YahooTokens
  } catch {
    return null
  }
}

/**
 * Store Yahoo OAuth tokens in the metadata table
 */
export function storeTokens(tokens: YahooTokens): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR REPLACE INTO metadata (key, value) VALUES ('yahoo_tokens', @value)"
  ).run({ value: JSON.stringify(tokens) })
}

/**
 * Clear stored Yahoo OAuth tokens
 */
export function clearTokens(): void {
  const db = getDatabase()
  db.prepare("DELETE FROM metadata WHERE key = 'yahoo_tokens'").run()
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<YahooTokens> {
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Yahoo OAuth credentials not configured')
  }

  const response = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Yahoo token exchange failed: ${error}`)
  }

  const data = await response.json()
  const tokens: YahooTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }

  storeTokens(tokens)
  return tokens
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Yahoo OAuth credentials not configured')
  }

  const stored = getStoredTokens()
  if (!stored?.refresh_token) {
    throw new Error('No Yahoo refresh token stored. Connect Yahoo from admin settings.')
  }

  const response = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refresh_token,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    // If refresh token is invalid, clear it
    if (response.status === 401 || response.status === 400) {
      clearTokens()
    }
    throw new Error(`Yahoo token refresh failed: ${error}`)
  }

  const data = await response.json()
  const tokens: YahooTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || stored.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }

  storeTokens(tokens)
  return tokens.access_token
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string> {
  const stored = getStoredTokens()
  if (!stored) {
    throw new Error('Yahoo not connected. Connect Yahoo from admin settings.')
  }

  // If token is still valid (with 5 min buffer), use it
  if (stored.expires_at > Date.now() + 5 * 60 * 1000) {
    return stored.access_token
  }

  // Otherwise refresh
  return refreshAccessToken()
}

/**
 * Check if Yahoo is connected (has stored tokens)
 */
export function isYahooConnected(): boolean {
  return getStoredTokens() !== null
}
