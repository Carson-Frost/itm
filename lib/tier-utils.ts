import { RankedPlayer, TierSeparator, DisplayItem } from "@/lib/types/ranking-schemas"

// CSS variable names for tier colors, cycling with modulo for >8 tiers
export const tierColors = [
  "var(--tier-1)",
  "var(--tier-2)",
  "var(--tier-3)",
  "var(--tier-4)",
  "var(--tier-5)",
  "var(--tier-6)",
  "var(--tier-7)",
  "var(--tier-8)",
]

export function getTierColor(index: number): string {
  return tierColors[index % tierColors.length]
}

export function isTierId(id: string): boolean {
  return id.startsWith("tier_")
}

export function getItemId(item: DisplayItem): string {
  return item.type === "tier" ? item.data.id : item.data.playerId
}

// Interleave tiers into the player list based on afterRank
export function mergeItems(players: RankedPlayer[], tiers: TierSeparator[]): DisplayItem[] {
  if (!tiers || tiers.length === 0) {
    return players.map((p) => ({ type: "player", data: p }))
  }

  // Index tiers by the rank they follow
  const tiersByAfterRank = new Map<number, TierSeparator[]>()
  for (const tier of tiers) {
    const existing = tiersByAfterRank.get(tier.afterRank) || []
    existing.push(tier)
    tiersByAfterRank.set(tier.afterRank, existing)
  }

  const items: DisplayItem[] = []

  // Tiers with afterRank 0 go at the top
  const topTiers = tiersByAfterRank.get(0)
  if (topTiers) {
    for (const tier of topTiers) {
      items.push({ type: "tier", data: tier })
    }
  }

  for (const player of players) {
    items.push({ type: "player", data: player })
    const tiersAfter = tiersByAfterRank.get(player.rank)
    if (tiersAfter) {
      for (const tier of tiersAfter) {
        items.push({ type: "tier", data: tier })
      }
    }
  }

  return items
}

// Separate a merged display list back into players and tiers,
// re-ranking players sequentially and updating tier afterRank values
export function splitItems(items: DisplayItem[]): { players: RankedPlayer[]; tiers: TierSeparator[] } {
  const players: RankedPlayer[] = []
  const tiers: TierSeparator[] = []
  let currentRank = 0

  for (const item of items) {
    if (item.type === "player") {
      currentRank++
      players.push({ ...item.data, rank: currentRank })
    } else {
      // afterRank = rank of the last player above, or 0 if at top
      tiers.push({ ...item.data, afterRank: currentRank })
    }
  }

  return { players, tiers }
}
