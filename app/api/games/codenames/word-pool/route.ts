import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/connection"
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

    // NFL Teams (hardcoded, no DB needed)
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

    // NFL Players from SQLite
    if (includePlayers) {
      const db = getDatabase()
      const rows = db
        .prepare(
          `SELECT DISTINCT r.full_name, r.position, r.team, r.headshot_url
           FROM roster_data r
           JOIN season_stats s ON r.gsis_id = s.player_id AND r.season = s.season
           WHERE r.season >= 2020
             AND r.position IN ('QB', 'RB', 'WR', 'TE')
             AND COALESCE(s.fantasy_points_ppr, 0) >= 100
           ORDER BY COALESCE(s.fantasy_points_ppr, 0) DESC
           LIMIT 300`
        )
        .all() as { full_name: string; position: string; team: string; headshot_url: string | null }[]

      const seenNames = new Set<string>()
      for (const row of rows) {
        if (seenNames.has(row.full_name)) continue
        seenNames.add(row.full_name)
        pool.push({
          name: row.full_name,
          imageUrl: row.headshot_url || null,
          contentType: "player",
          subtitle: `${row.position} - ${row.team}`,
        })
      }
    }

    // College teams from Firestore admin-managed content
    if (includeColleges) {
      try {
        const firestore = getAdminFirestore()
        const snap = await firestore
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
      } catch {
        // Firestore may not be configured — skip silently
      }
    }

    // Coaches from Firestore admin-managed content
    if (includeCoaches) {
      try {
        const firestore = getAdminFirestore()
        const snap = await firestore
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
      } catch {
        // Firestore may not be configured — skip silently
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
