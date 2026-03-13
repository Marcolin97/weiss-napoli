// Domain types shared between server and client.
// These mirror the database schema and are used for API responses and client state.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TournamentStatus = 'draft' | 'active' | 'finalized'
export type TournamentEntryMode = 'managed' | 'manual'

// Points awarded per match win (fixed by domain rules)
export const POINTS_PER_WIN = 3 as const

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Player {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface League {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ClimaxTriggerType {
  id: string
  name: string
  label: string
}

export interface Tournament {
  id: string
  leagueId: string
  name: string
  date: string // ISO date string: YYYY-MM-DD
  roundCount: 3 | 4
  pairBlockIndex: number // 1-based consecutive pair block for league standings
  status: TournamentStatus
  entryMode: TournamentEntryMode
  winnerPlayerId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TournamentParticipation {
  id: string
  tournamentId: string
  playerId: string
  climaxTriggerTypeId: string
  climaxTriggerTypeId2: string | null
  pointsEarned: number
  finalPlacement: number | null // null until tournament is finalized
  isWinner: boolean
  wasAbsent: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Match {
  id: string
  tournamentId: string
  roundNumber: number
  player1Id: string | null // null when isBye is true
  player2Id: string | null // null when isBye is true
  winnerPlayerId: string | null // null until result is registered
  isBye: boolean
  createdAt: Date
  updatedAt: Date
}

// ─── API response shapes ──────────────────────────────────────────────────────

/** Tournament row joined with its league name */
export interface TournamentWithLeague {
  id: string
  leagueId: string
  leagueName: string
  name: string
  date: string
  roundCount: 3 | 4
  pairBlockIndex: number
  status: TournamentStatus
  entryMode: TournamentEntryMode
  winnerPlayerId: string | null
  createdAt: Date
  updatedAt: Date
}

/** Participant row joined with player name and trigger type details */
export interface ParticipantDetail {
  id: string
  tournamentId: string
  playerId: string
  playerName: string
  climaxTriggerTypeId: string
  triggerTypeName: string
  triggerTypeLabel: string
  climaxTriggerTypeId2: string | null
  triggerTypeName2: string | null
  triggerTypeLabel2: string | null
  pointsEarned: number
  finalPlacement: number | null
  isWinner: boolean
  wasAbsent: boolean
  createdAt: Date
  updatedAt: Date
}
export interface PlayerSummary extends Player {
  tournamentsPlayed: number
  totalLeaguePoints: number
  winnerStars: number
}

/** Tournament with its league and participant list */
export interface TournamentDetail extends Tournament {
  league: Pick<League, 'id' | 'name'>
  participants: (TournamentParticipation & {
    player: Pick<Player, 'id' | 'name'>
    triggerType: ClimaxTriggerType
  })[]
}

// ─── Rounds & results ────────────────────────────────────────────────────────

export interface MatchDetail {
  id: string
  tournamentId: string
  roundNumber: number
  player1Id: string | null
  player1Name: string | null
  player2Id: string | null
  player2Name: string | null
  winnerPlayerId: string | null
  isBye: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RoundSummary {
  roundNumber: number
  matches: MatchDetail[]
  /** True when every match in the round has a winnerPlayerId set */
  isComplete: boolean
}

export interface TournamentStanding {
  playerId: string
  playerName: string
  placement: number
  points: number
  wins: number
  losses: number
  byes: number
  isWinner: boolean
}

export interface RoundsAndStandings {
  rounds: RoundSummary[]
  standings: TournamentStanding[]
  roundCount: number
}

/** Per-player result for one tournament pair block used in league standings */
export interface PairBlockResult {
  pairBlockIndex: number
  selectedTournamentId: string | null // the tournament whose result was chosen as "best"
  points: number
  finalPlacement: number | null
  wasAbsent: boolean
}

/** Full league standing entry for one player */
export interface LeagueStandingEntry {
  player: Pick<Player, 'id' | 'name'>
  totalPoints: number
  winnerStars: number
  pairResults: PairBlockResult[]
  tournamentsPlayed: number
  absences: number
}

// ─── League standings API response types ─────────────────────────────────────

/** One tournament's result for a player within a pair block */
export interface TournamentResultInPair {
  tournamentId: string
  tournamentName: string
  tournamentDate: string
  tournamentStatus: string
  points: number
  finalPlacement: number | null
  isWinner: boolean
  wasAbsent: boolean
  /** True if this tournament was chosen as the "best" result for this pair */
  isSelected: boolean
}

/** Computed result for one pair block for one player */
export interface LeaguePairBlockResult {
  pairBlockIndex: number
  /** Points contributed to the league total (from the selected tournament) */
  selectedPoints: number
  tournaments: TournamentResultInPair[]
}

/** One row in the league standings table */
export interface LeagueStandingRow {
  rank: number
  playerId: string
  playerName: string
  totalPoints: number
  winnerStars: number
  tournamentsPlayed: number
  absences: number
  pairBlocks: LeaguePairBlockResult[]
}

/** Full response from GET /api/leagues/[id]/standings */
export interface LeagueStandingsResponse {
  leagueId: string
  leagueName: string
  pairBlockCount: number
  allPairBlockIndices: number[]
  standings: LeagueStandingRow[]
}

/** One tournament entry in a player's history */
export interface PlayerTournamentHistoryEntry {
  tournamentId: string
  tournamentName: string
  tournamentDate: string
  tournamentStatus: TournamentStatus
  leagueId: string
  leagueName: string
  pointsEarned: number
  finalPlacement: number | null
  isWinner: boolean
}
