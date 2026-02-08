// NFL Team, Division, and Conference data

export type NFLConference = 'AFC' | 'NFC'
export type NFLDivision =
  | 'AFC East' | 'AFC North' | 'AFC South' | 'AFC West'
  | 'NFC East' | 'NFC North' | 'NFC South' | 'NFC West'

export interface NFLTeam {
  abbr: string
  name: string
  city: string
  division: NFLDivision
  conference: NFLConference
}

export const nflTeams: NFLTeam[] = [
  // AFC East
  { abbr: 'BUF', name: 'Bills', city: 'Buffalo', division: 'AFC East', conference: 'AFC' },
  { abbr: 'MIA', name: 'Dolphins', city: 'Miami', division: 'AFC East', conference: 'AFC' },
  { abbr: 'NE', name: 'Patriots', city: 'New England', division: 'AFC East', conference: 'AFC' },
  { abbr: 'NYJ', name: 'Jets', city: 'New York', division: 'AFC East', conference: 'AFC' },
  // AFC North
  { abbr: 'BAL', name: 'Ravens', city: 'Baltimore', division: 'AFC North', conference: 'AFC' },
  { abbr: 'CIN', name: 'Bengals', city: 'Cincinnati', division: 'AFC North', conference: 'AFC' },
  { abbr: 'CLE', name: 'Browns', city: 'Cleveland', division: 'AFC North', conference: 'AFC' },
  { abbr: 'PIT', name: 'Steelers', city: 'Pittsburgh', division: 'AFC North', conference: 'AFC' },
  // AFC South
  { abbr: 'HOU', name: 'Texans', city: 'Houston', division: 'AFC South', conference: 'AFC' },
  { abbr: 'IND', name: 'Colts', city: 'Indianapolis', division: 'AFC South', conference: 'AFC' },
  { abbr: 'JAX', name: 'Jaguars', city: 'Jacksonville', division: 'AFC South', conference: 'AFC' },
  { abbr: 'TEN', name: 'Titans', city: 'Tennessee', division: 'AFC South', conference: 'AFC' },
  // AFC West
  { abbr: 'DEN', name: 'Broncos', city: 'Denver', division: 'AFC West', conference: 'AFC' },
  { abbr: 'KC', name: 'Chiefs', city: 'Kansas City', division: 'AFC West', conference: 'AFC' },
  { abbr: 'LV', name: 'Raiders', city: 'Las Vegas', division: 'AFC West', conference: 'AFC' },
  { abbr: 'LAC', name: 'Chargers', city: 'Los Angeles', division: 'AFC West', conference: 'AFC' },
  // NFC East
  { abbr: 'DAL', name: 'Cowboys', city: 'Dallas', division: 'NFC East', conference: 'NFC' },
  { abbr: 'NYG', name: 'Giants', city: 'New York', division: 'NFC East', conference: 'NFC' },
  { abbr: 'PHI', name: 'Eagles', city: 'Philadelphia', division: 'NFC East', conference: 'NFC' },
  { abbr: 'WAS', name: 'Commanders', city: 'Washington', division: 'NFC East', conference: 'NFC' },
  // NFC North
  { abbr: 'CHI', name: 'Bears', city: 'Chicago', division: 'NFC North', conference: 'NFC' },
  { abbr: 'DET', name: 'Lions', city: 'Detroit', division: 'NFC North', conference: 'NFC' },
  { abbr: 'GB', name: 'Packers', city: 'Green Bay', division: 'NFC North', conference: 'NFC' },
  { abbr: 'MIN', name: 'Vikings', city: 'Minnesota', division: 'NFC North', conference: 'NFC' },
  // NFC South
  { abbr: 'ATL', name: 'Falcons', city: 'Atlanta', division: 'NFC South', conference: 'NFC' },
  { abbr: 'CAR', name: 'Panthers', city: 'Carolina', division: 'NFC South', conference: 'NFC' },
  { abbr: 'NO', name: 'Saints', city: 'New Orleans', division: 'NFC South', conference: 'NFC' },
  { abbr: 'TB', name: 'Buccaneers', city: 'Tampa Bay', division: 'NFC South', conference: 'NFC' },
  // NFC West
  { abbr: 'ARI', name: 'Cardinals', city: 'Arizona', division: 'NFC West', conference: 'NFC' },
  { abbr: 'LA', name: 'Rams', city: 'Los Angeles', division: 'NFC West', conference: 'NFC' },
  { abbr: 'SF', name: '49ers', city: 'San Francisco', division: 'NFC West', conference: 'NFC' },
  { abbr: 'SEA', name: 'Seahawks', city: 'Seattle', division: 'NFC West', conference: 'NFC' },
]

export const nflDivisions: NFLDivision[] = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
]

export const nflConferences: NFLConference[] = ['AFC', 'NFC']

// Alphabetically sorted team abbreviations (matches fantasy charts)
export const nflTeamAbbreviations: string[] = nflTeams.map(t => t.abbr).sort()

// Get teams by division
export function getTeamsByDivision(division: NFLDivision): NFLTeam[] {
  return nflTeams.filter(t => t.division === division)
}

// Get teams by conference
export function getTeamsByConference(conference: NFLConference): NFLTeam[] {
  return nflTeams.filter(t => t.conference === conference)
}

// Get team by abbreviation
export function getTeamByAbbr(abbr: string): NFLTeam | undefined {
  return nflTeams.find(t => t.abbr === abbr)
}

// Get team logo URL
export function getTeamLogoUrl(teamAbbr: string): string {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${teamAbbr.toLowerCase()}.png`
}

// Team filter options grouped by category
export interface TeamFilterOption {
  value: string
  label: string
  type: 'all' | 'conference' | 'division' | 'team'
}

export function getTeamFilterOptions(): TeamFilterOption[] {
  const options: TeamFilterOption[] = [
    { value: 'ALL', label: 'All Teams', type: 'all' },
  ]

  // Add conferences
  nflConferences.forEach(conf => {
    options.push({ value: conf, label: conf, type: 'conference' })
  })

  // Add divisions
  nflDivisions.forEach(div => {
    options.push({ value: div, label: div, type: 'division' })
  })

  // Add teams (alphabetically)
  nflTeamAbbreviations.forEach(abbr => {
    const team = nflTeams.find(t => t.abbr === abbr)
    options.push({ value: abbr, label: team ? `${abbr} - ${team.name}` : abbr, type: 'team' })
  })

  return options
}

// Check if a team matches a filter (ALL, conference, division, or specific team)
export function teamMatchesFilter(teamAbbr: string, filter: string): boolean {
  if (filter === 'ALL') return true

  // Check if filter is a conference
  if (nflConferences.includes(filter as NFLConference)) {
    const team = nflTeams.find(t => t.abbr === teamAbbr)
    return team?.conference === filter
  }

  // Check if filter is a division
  if (nflDivisions.includes(filter as NFLDivision)) {
    const team = nflTeams.find(t => t.abbr === teamAbbr)
    return team?.division === filter
  }

  // Direct team match
  return teamAbbr === filter
}
