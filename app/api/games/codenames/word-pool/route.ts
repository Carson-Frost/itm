import { NextRequest, NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"
import { nflTeams } from "@/lib/team-utils"
import type { WordPoolItem } from "@/lib/types/codenames"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const includePlayers = searchParams.get("players") !== "false"
    const includeTeams = searchParams.get("teams") !== "false"
    const includeColleges = searchParams.get("colleges") === "true"
    const includeCoaches = searchParams.get("coaches") === "true"

    const pool: WordPoolItem[] = []

    // NFL Teams
    if (includeTeams) {
      for (const team of nflTeams) {
        pool.push({
          name: `${team.city} ${team.name}`,
          imageUrl: `https://a.espncdn.com/i/teamlogos/nfl/500/${team.abbr.toLowerCase()}.png`,
          contentType: "team",
          subtitle: team.abbr,
        })
      }
    }

    // NFL Players - get a random sample from player_seasons
    if (includePlayers) {
      const db = getAdminFirestore()
      // Get notable players - those with high fantasy points from recent seasons
      const playersSnap = await db
        .collection("player_seasons")
        .where("season", ">=", 2020)
        .where("fantasyPointsPpr", ">=", 100)
        .orderBy("fantasyPointsPpr", "desc")
        .limit(300)
        .get()

      const seenNames = new Set<string>()
      for (const doc of playersSnap.docs) {
        const d = doc.data()
        const name = d.name as string
        if (seenNames.has(name)) continue
        seenNames.add(name)
        pool.push({
          name,
          imageUrl: (d.headshotUrl as string) || null,
          contentType: "player",
          subtitle: `${d.position} - ${d.team}`,
        })
      }
    }

    // College teams from admin-managed content
    if (includeColleges) {
      const db = getAdminFirestore()
      const snap = await db
        .collection("codenames_content")
        .where("type", "==", "college")
        .get()

      for (const doc of snap.docs) {
        const d = doc.data()
        pool.push({
          name: d.name as string,
          imageUrl: (d.imageUrl as string) || null,
          contentType: "college",
          subtitle: d.subtitle || null,
        })
      }
    }

    // Coaches from admin-managed content
    if (includeCoaches) {
      const db = getAdminFirestore()
      const snap = await db
        .collection("codenames_content")
        .where("type", "==", "coach")
        .get()

      for (const doc of snap.docs) {
        const d = doc.data()
        pool.push({
          name: d.name as string,
          imageUrl: (d.imageUrl as string) || null,
          contentType: "coach",
          subtitle: d.subtitle || null,
        })
      }
    }

    // Shuffle the pool
    const shuffled = pool.sort(() => Math.random() - 0.5)

    return NextResponse.json({ pool: shuffled, total: shuffled.length })
  } catch (error) {
    console.error("Word pool error:", error)
    return NextResponse.json({ error: "Failed to fetch word pool" }, { status: 500 })
  }
}
