/**
 * League standings computation.
 *
 * Implements the pair-best selection algorithm from domain-rules.md:
 * - Tournaments are grouped in consecutive pairs by pairBlockIndex
 * - For each pair, a player's "best" result is selected to contribute to the league total
 * - Winner stars are aggregated independently across all tournaments
 *
 * All tie-break logic is isolated in `selectBestInPair` for easy extension.
 */

import { createError } from 'h3'
import { eq, asc, inArray } from 'drizzle-orm'
import { db } from '../db/index'
import { leagues, tournaments, tournamentParticipations, players } from '../db/schema'
import type {
  LeagueStandingsResponse,
  LeagueStandingRow,
  LeaguePairBlockResult,
  TournamentResultInPair,
} from '../../types/domain'

// ─── Internal types ───────────────────────────────────────────────────────────

interface PlayerTournamentResult {
  participationId: string
  tournamentId: string
  tournamentDate: string
  playerId: string
  playerName: string
  pointsEarned: number
  finalPlacement: number | null
  isWinner: boolean
  wasAbsent: boolean
}

// ─── Pair-best tie-break ──────────────────────────────────────────────────────

/**
 * Select the better of two tournament results for league standing purposes.
 *
 * Tie-break order (authoritative: domain-rules.md):
 *   1. Higher points
 *   2. Better final placement (lower number = better; null → treated as worst)
 *   3. Tournament win (isWinner = true preferred)
 *   4. Latest tournament (by date)
 *   5. Stable deterministic fallback: first tournament in the pair
 *
 * To extend tie-breaks, add new conditions between steps 3 and 4.
 */
function selectBestInPair(
  r1: PlayerTournamentResult | null,
  r2: PlayerTournamentResult | null,
): string | null {
  if (!r1 && !r2) return null
  if (!r1 || r1.wasAbsent) return r2 && !r2.wasAbsent ? r2.tournamentId : null
  if (!r2 || r2.wasAbsent) return r1.tournamentId

  // 1. Points DESC
  if (r1.pointsEarned !== r2.pointsEarned) {
    return r1.pointsEarned > r2.pointsEarned ? r1.tournamentId : r2.tournamentId
  }

  // 2. Placement ASC (lower rank = better; null = not yet finalized → worst)
  const p1 = r1.finalPlacement ?? Infinity
  const p2 = r2.finalPlacement ?? Infinity
  if (p1 !== p2) {
    return p1 < p2 ? r1.tournamentId : r2.tournamentId
  }

  // 3. Tournament win
  if (r1.isWinner !== r2.isWinner) {
    return r1.isWinner ? r1.tournamentId : r2.tournamentId
  }

  // 4. Latest tournament in the pair (prefer more recent)
  if (r1.tournamentDate !== r2.tournamentDate) {
    return r1.tournamentDate > r2.tournamentDate ? r1.tournamentId : r2.tournamentId
  }

  // 5. Stable: first tournament in the pair (keeps sort deterministic)
  return r1.tournamentId
}

// ─── Main computation ─────────────────────────────────────────────────────────

export async function computeLeagueStandings(leagueId: string): Promise<LeagueStandingsResponse> {
  const league = await db.select().from(leagues).where(eq(leagues.id, leagueId)).get()
  if (!league) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }

  // All tournaments ordered within blocks and chronologically
  const leagueTournaments = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.leagueId, leagueId))
    .orderBy(asc(tournaments.pairBlockIndex), asc(tournaments.date), asc(tournaments.createdAt))
    .all()

  if (leagueTournaments.length === 0) {
    return {
      leagueId,
      leagueName: league.name,
      pairBlockCount: 0,
      allPairBlockIndices: [],
      standings: [],
    }
  }

  const tournamentIds = leagueTournaments.map(t => t.id)

  // NOTE: inArray() with an empty array throws in Drizzle — the early return above is required.
  // All participations for all tournaments in the league, with player names
  const rawParticipations = await db
    .select({
      participationId: tournamentParticipations.id,
      tournamentId: tournamentParticipations.tournamentId,
      playerId: tournamentParticipations.playerId,
      playerName: players.name,
      pointsEarned: tournamentParticipations.pointsEarned,
      finalPlacement: tournamentParticipations.finalPlacement,
      isWinner: tournamentParticipations.isWinner,
      wasAbsent: tournamentParticipations.wasAbsent,
    })
    .from(tournamentParticipations)
    .innerJoin(players, eq(tournamentParticipations.playerId, players.id))
    .where(inArray(tournamentParticipations.tournamentId, tournamentIds))
    .all()

  // Build lookup: playerId → tournamentId → result
  const participationByPlayerByTournament = new Map<string, Map<string, PlayerTournamentResult>>()
  const playerNames = new Map<string, string>()

  for (const p of rawParticipations) {
    const t = leagueTournaments.find(t => t.id === p.tournamentId)!
    const result: PlayerTournamentResult = {
      participationId: p.participationId,
      tournamentId: p.tournamentId,
      tournamentDate: t.date,
      playerId: p.playerId,
      playerName: p.playerName,
      pointsEarned: p.pointsEarned,
      finalPlacement: p.finalPlacement,
      isWinner: p.isWinner,
      wasAbsent: p.wasAbsent,
    }
    if (!participationByPlayerByTournament.has(p.playerId)) {
      participationByPlayerByTournament.set(p.playerId, new Map())
    }
    participationByPlayerByTournament.get(p.playerId)!.set(p.tournamentId, result)
    playerNames.set(p.playerId, p.playerName)
  }

  // Pair block structure
  const allPairBlockIndices = [...new Set(leagueTournaments.map(t => t.pairBlockIndex))].sort(
    (a, b) => a - b,
  )
  const tournamentsByBlock = new Map<number, typeof leagueTournaments>()
  for (const t of leagueTournaments) {
    const existing = tournamentsByBlock.get(t.pairBlockIndex) ?? []
    existing.push(t)
    tournamentsByBlock.set(t.pairBlockIndex, existing)
  }

  // Compute one standing row per player
  const standingRows: LeagueStandingRow[] = []

  for (const [playerId, playerName] of playerNames) {
    const playerResults = participationByPlayerByTournament.get(playerId)!
    let totalPoints = 0
    let winnerStars = 0
    let tournamentsPlayed = 0
    let absences = 0
    const pairBlocks: LeaguePairBlockResult[] = []

    // Winner stars count all tournament wins regardless of pair-best selection
    for (const r of playerResults.values()) {
      if (r.isWinner) winnerStars++
    }

    for (const blockIndex of allPairBlockIndices) {
      const blockTournaments = tournamentsByBlock.get(blockIndex) ?? []

      // Map each tournament in the block to either the player's result or an absent record
      const tournamentResults: TournamentResultInPair[] = blockTournaments.map(t => {
        const r = playerResults.get(t.id)
        if (!r || r.wasAbsent) {
          absences++
          return {
            tournamentId: t.id,
            tournamentName: t.name,
            tournamentDate: t.date,
            tournamentStatus: t.status,
            points: 0,
            finalPlacement: null,
            isWinner: false,
            wasAbsent: true,
            isSelected: false,
          }
        }
        tournamentsPlayed++
        return {
          tournamentId: t.id,
          tournamentName: t.name,
          tournamentDate: t.date,
          tournamentStatus: t.status,
          points: r.pointsEarned,
          finalPlacement: r.finalPlacement,
          isWinner: r.isWinner,
          wasAbsent: false,
          isSelected: false, // resolved below
        }
      })

      // Determine which tournament in the pair is selected
      const [t1, t2] = blockTournaments
      const r1 = playerResults.get(t1?.id ?? '') ?? null
      const r2 = t2 ? (playerResults.get(t2.id) ?? null) : null

      const selectedTournamentId
        = blockTournaments.length === 1
          ? (r1 && !r1.wasAbsent ? t1.id : null) // single-tournament block (last pair if odd count)
          : selectBestInPair(r1, r2)

      let selectedPoints = 0
      for (const tr of tournamentResults) {
        if (tr.tournamentId === selectedTournamentId) {
          tr.isSelected = true
          selectedPoints = tr.points
        }
      }

      totalPoints += selectedPoints
      pairBlocks.push({ pairBlockIndex: blockIndex, selectedPoints, tournaments: tournamentResults })
    }

    standingRows.push({
      rank: 0, // set after sort
      playerId,
      playerName,
      totalPoints,
      winnerStars,
      tournamentsPlayed,
      absences,
      pairBlocks,
    })
  }

  // Rank: primary = totalPoints DESC, then winnerStars DESC, then tournamentsPlayed DESC, then name ASC
  standingRows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.winnerStars !== a.winnerStars) return b.winnerStars - a.winnerStars
    if (b.tournamentsPlayed !== a.tournamentsPlayed) return b.tournamentsPlayed - a.tournamentsPlayed
    return a.playerName.localeCompare(b.playerName)
  })
  standingRows.forEach((row, i) => {
    row.rank = i + 1
  })

  return {
    leagueId,
    leagueName: league.name,
    pairBlockCount: allPairBlockIndices.length,
    allPairBlockIndices,
    standings: standingRows,
  }
}
