import { RankedPlayer, TierSeparator, DisplayItem } from "@/lib/types/ranking-schemas"

// Curated OKLCH colors for the first 8 tiers, then golden angle distribution
const curatedHues: [number, number, number][] = [
  [0.72, 0.16, 85],   // 1: Gold
  [0.70, 0.18, 350],  // 2: Pink
  [0.55, 0.20, 300],  // 3: Purple
  [0.58, 0.18, 240],  // 4: Blue
  [0.62, 0.17, 155],  // 5: Green
  [0.78, 0.16, 95],   // 6: Yellow
  [0.68, 0.18, 55],   // 7: Orange
  [0.58, 0.22, 25],   // 8: Red
]
const GOLDEN_ANGLE = 137.508

export function generateTierColor(index: number): string {
  if (index < curatedHues.length) {
    const [l, c, h] = curatedHues[index]
    return `oklch(${l} ${c} ${h})`
  }
  const hue = ((index - curatedHues.length + 1) * GOLDEN_ANGLE + 200) % 360
  return `oklch(0.65 0.15 ${hue})`
}

// Backfill persisted colors onto legacy tiers that don't have them.
// Uses each tier's sorted position index as its hueIndex so colors are
// stable even when new tiers are inserted between existing ones.
// Returns { tiers, hueIndex } where hueIndex is the next available slot.
export function backfillTierColors(
  tiers: TierSeparator[],
  currentHueIndex: number
): { tiers: TierSeparator[]; hueIndex: number } {
  const sorted = [...tiers].sort((a, b) => a.afterRank - b.afterRank)
  let nextHue = currentHueIndex
  const filled = sorted.map((tier, i) => {
    if (tier.color) return tier
    // Assign a color from the position index for legacy data
    const color = generateTierColor(i)
    nextHue = Math.max(nextHue, i + 1)
    return { ...tier, color, colorCustomized: false }
  })
  return { tiers: filled, hueIndex: nextHue }
}

export function isDefaultTierName(label: string): boolean {
  return /^Tier \d+$/.test(label)
}

// Recalculate default tier names after reorder/add/remove.
// Custom-named tiers are left untouched.
export function recalcDefaultNames(tiers: TierSeparator[]): TierSeparator[] {
  const sorted = [...tiers].sort((a, b) => a.afterRank - b.afterRank)
  return sorted.map((tier, i) => {
    if (isDefaultTierName(tier.label)) {
      return { ...tier, label: `Tier ${i + 1}` }
    }
    return tier
  })
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

// Bucket of players belonging to one tier (or untiered)
export interface TierBucket {
  tierIndex: number | null
  tierId: string | null
  label: string
  color: string | null
  colorCustomized: boolean
  players: RankedPlayer[]
}

// Group players into tier buckets based on tier separator positions.
// Each separator sits AFTER afterRank, so the tier owns players up to and
// including afterRank. Players after the last separator are "Untiered".
export function groupByTiers(players: RankedPlayer[], tiers: TierSeparator[]): TierBucket[] {
  if (!tiers || tiers.length === 0) {
    return [{ tierIndex: null, tierId: null, label: "Untiered", color: null, colorCustomized: false, players }]
  }

  const sorted = [...tiers].sort((a, b) => a.afterRank - b.afterRank)

  const buckets: TierBucket[] = []
  let playerIdx = 0

  // Each tier owns players from the previous boundary up to its afterRank
  for (let i = 0; i < sorted.length; i++) {
    const upperBound = sorted[i].afterRank
    const tierPlayers: RankedPlayer[] = []

    while (playerIdx < players.length && players[playerIdx].rank <= upperBound) {
      tierPlayers.push(players[playerIdx])
      playerIdx++
    }

    // Use persisted color, fall back to position-based generation for legacy data
    const color = sorted[i].color || generateTierColor(i)

    buckets.push({
      tierIndex: i,
      tierId: sorted[i].id,
      label: sorted[i].label,
      color,
      colorCustomized: sorted[i].colorCustomized ?? false,
      players: tierPlayers,
    })
  }

  // Players after the last separator
  if (playerIdx < players.length) {
    const remaining: RankedPlayer[] = []
    while (playerIdx < players.length) {
      remaining.push(players[playerIdx])
      playerIdx++
    }
    buckets.push({ tierIndex: null, tierId: null, label: "Untiered", color: null, colorCustomized: false, players: remaining })
  }

  return buckets
}

// Convert tier buckets back into ranked players and tier separators.
// Players are re-ranked sequentially across buckets; tier afterRank values
// are derived from the last player above each separator.
export function bucketsToData(buckets: TierBucket[]): { players: RankedPlayer[]; tiers: TierSeparator[] } {
  const merged: DisplayItem[] = []
  for (const bucket of buckets) {
    for (const player of bucket.players) {
      merged.push({ type: "player", data: player })
    }
    // Separator goes AFTER its players — afterRank = rank of last player above.
    // Preserve color and colorCustomized from the original tier data.
    if (bucket.tierId) {
      merged.push({
        type: "tier",
        data: {
          id: bucket.tierId,
          label: bucket.label,
          afterRank: 0,
          color: bucket.color || "",
          colorCustomized: bucket.colorCustomized,
        },
      })
    }
  }
  return splitItems(merged)
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
