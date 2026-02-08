import { NextResponse } from "next/server"

export interface NFLState {
  week: number
  season_type: "pre" | "regular" | "post"
  season_start_date: string
  season: string
  previous_season: string
  leg: number
  league_season: string
  league_create_season: string
  display_week: number
}

export async function GET() {
  try {
    const response = await fetch("https://api.sleeper.app/v1/state/nfl", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch NFL state" },
        { status: response.status }
      )
    }

    const data: NFLState = await response.json()

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch NFL state" },
      { status: 500 }
    )
  }
}
