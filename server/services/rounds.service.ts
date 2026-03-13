import { createError } from 'h3'
import { eq, asc, and, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '../db/index'
import { tournaments, tournamentParticipations, players, matches } from '../db/schema'
import { generatePairings, type PairingParticipant } from './pairing.service'
import { computeScores, rankParticipants, type MatchOutcome } from './scoring.service'
import { getTournament } from './tournament.service'
import { sendTournamentResultToDiscord } from '../utils/discord'
import type { MatchDetail, RoundSummary, TournamentStanding, RoundsAndStandings } from '../../types/domain'

// Aliased player table for double-join in match queries
const p1 = alias(players, 'p1')
const p2 = alias(players, 'p2')

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function queryMatchesWithNames(tournamentId: string): Promise<MatchDetail[]> {
  const rows = await db
    .select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      roundNumber: matches.roundNumber,
      player1Id: matches.player1Id,
      player1Name: p1.name,
      player2Id: matches.player2Id,
      player2Name: p2.name,
      winnerPlayerId: matches.winnerPlayerId,
      isBye: matches.isBye,
      createdAt: matches.createdAt,
      updatedAt: matches.updatedAt,
    })
    .from(matches)
    .leftJoin(p1, eq(matches.player1Id, p1.id))
    .leftJoin(p2, eq(matches.player2Id, p2.id))
    .where(eq(matches.tournamentId, tournamentId))
    .orderBy(asc(matches.roundNumber), asc(matches.createdAt))
    .all()

  return rows as MatchDetail[]
}

function buildOutcomes(matchRows: MatchDetail[]): MatchOutcome[] {
  const outcomes: MatchOutcome[] = []
  for (const match of matchRows) {
    if (!match.winnerPlayerId) continue
    if (match.isBye && match.player1Id) {
      outcomes.push({ playerId: match.player1Id, outcome: 'bye' })
    }
    else if (match.player1Id && match.player2Id) {
      outcomes.push({ playerId: match.winnerPlayerId, outcome: 'win' })
      const loserId = match.player1Id === match.winnerPlayerId ? match.player2Id : match.player1Id
      outcomes.push({ playerId: loserId, outcome: 'loss' })
    }
  }
  return outcomes
}

function groupMatchesByRound(matchRows: MatchDetail[]): RoundSummary[] {
  const roundMap = new Map<number, MatchDetail[]>()
  for (const m of matchRows) {
    const existing = roundMap.get(m.roundNumber) ?? []
    existing.push(m)
    roundMap.set(m.roundNumber, existing)
  }
  return Array.from(roundMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, roundMatches]) => ({
      roundNumber,
      matches: roundMatches,
      isComplete: roundMatches.every(m => m.winnerPlayerId !== null),
    }))
}

async function recomputeParticipantPoints(tournamentId: string): Promise<void> {
  const participationRows = await db
    .select()
    .from(tournamentParticipations)
    .where(eq(tournamentParticipations.tournamentId, tournamentId))
    .all()

  const matchRows = await queryMatchesWithNames(tournamentId)
  const participantIds = participationRows.map(p => p.playerId)
  const outcomes = buildOutcomes(matchRows)
  const scores = computeScores(participantIds, outcomes)

  for (const score of scores) {
    await db
      .update(tournamentParticipations)
      .set({ pointsEarned: score.points, updatedAt: new Date() })
      .where(
        and(
          eq(tournamentParticipations.tournamentId, tournamentId),
          eq(tournamentParticipations.playerId, score.playerId),
        ),
      )
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function listRoundsWithStandings(tournamentId: string): Promise<RoundsAndStandings> {
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .get()
  if (!tournament) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }

  const [matchRows, participationRows] = await Promise.all([
    queryMatchesWithNames(tournamentId),
    db
      .select({
        playerId: tournamentParticipations.playerId,
        playerName: players.name,
        isWinner: tournamentParticipations.isWinner,
      })
      .from(tournamentParticipations)
      .innerJoin(players, eq(tournamentParticipations.playerId, players.id))
      .where(eq(tournamentParticipations.tournamentId, tournamentId))
      .orderBy(asc(players.name))
      .all(),
  ])

  const rounds = groupMatchesByRound(matchRows)
  const participantIds = participationRows.map(p => p.playerId)
  const outcomes = buildOutcomes(matchRows)
  const scores = computeScores(participantIds, outcomes)
  const ranked = rankParticipants(scores)

  const playerNameMap = new Map(participationRows.map(p => [p.playerId, p.playerName]))
  const isWinnerMap = new Map(participationRows.map(p => [p.playerId, p.isWinner]))

  const standings: TournamentStanding[] = ranked.map(r => ({
    playerId: r.playerId,
    playerName: playerNameMap.get(r.playerId) ?? 'Unknown',
    placement: r.placement,
    points: r.points,
    wins: r.wins,
    losses: r.losses,
    byes: r.byes,
    isWinner: isWinnerMap.get(r.playerId) ?? false,
  }))

  return { rounds, standings, roundCount: tournament.roundCount }
}

export async function generateNextRound(tournamentId: string): Promise<RoundSummary> {
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .get()
  if (!tournament) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }
  if (tournament.status === 'finalized') {
    throw createError({ statusCode: 400, message: 'Tournament is already finalized' })
  }

  const participationRows = await db
    .select()
    .from(tournamentParticipations)
    .where(eq(tournamentParticipations.tournamentId, tournamentId))
    .all()

  if (participationRows.length < 2) {
    throw createError({ statusCode: 400, message: 'At least 2 participants are required to generate pairings' })
  }

  const existingMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .all()

  const existingRoundNumbers = [...new Set(existingMatches.map(m => m.roundNumber))].sort((a, b) => a - b)
  const lastRound = existingRoundNumbers[existingRoundNumbers.length - 1] ?? 0
  const nextRoundNumber = lastRound + 1

  // Previous round must be fully resolved before generating the next
  if (lastRound > 0) {
    const lastRoundMatches = existingMatches.filter(m => m.roundNumber === lastRound)
    if (lastRoundMatches.some(m => m.winnerPlayerId === null)) {
      throw createError({
        statusCode: 400,
        message: `Round ${lastRound} has unresolved matches. Register all results first.`,
      })
    }
  }

  if (nextRoundNumber > tournament.roundCount) {
    throw createError({ statusCode: 400, message: `All ${tournament.roundCount} rounds have already been generated` })
  }

  // Build current scoring state for the pairing algorithm
  const participantIds = participationRows.map(p => p.playerId)
  const rawOutcomes = buildOutcomes(
    existingMatches.map(m => ({
      id: m.id,
      tournamentId: m.tournamentId,
      roundNumber: m.roundNumber,
      player1Id: m.player1Id,
      player1Name: null,
      player2Id: m.player2Id,
      player2Name: null,
      winnerPlayerId: m.winnerPlayerId,
      isBye: m.isBye,
      createdAt: m.createdAt as Date,
      updatedAt: m.updatedAt as Date,
    })),
  )
  const scores = computeScores(participantIds, rawOutcomes)
  const scoreMap = new Map(scores.map(s => [s.playerId, s]))

  const previousPairings = existingMatches
    .filter(m => !m.isBye && m.player1Id && m.player2Id)
    .map(m => ({ player1Id: m.player1Id!, player2Id: m.player2Id! }))

  const pairingInput: PairingParticipant[] = participationRows.map(p => ({
    playerId: p.playerId,
    currentPoints: scoreMap.get(p.playerId)?.points ?? 0,
    byeCount: scoreMap.get(p.playerId)?.byes ?? 0,
  }))

  const { pairs, byePlayerId } = generatePairings(pairingInput, previousPairings, nextRoundNumber)

  // Build match rows to insert
  const newMatchRows: Array<{
    id: string
    tournamentId: string
    roundNumber: number
    player1Id: string | null
    player2Id: string | null
    winnerPlayerId: string | null
    isBye: boolean
  }> = pairs.map(pair => ({
    id: crypto.randomUUID(),
    tournamentId,
    roundNumber: nextRoundNumber,
    player1Id: pair.player1Id,
    player2Id: pair.player2Id,
    winnerPlayerId: null,
    isBye: false,
  }))

  if (byePlayerId) {
    // Byes are pre-resolved: the sole player immediately wins
    newMatchRows.push({
      id: crypto.randomUUID(),
      tournamentId,
      roundNumber: nextRoundNumber,
      player1Id: byePlayerId,
      player2Id: null,
      winnerPlayerId: byePlayerId,
      isBye: true,
    })
  }

  await db.insert(matches).values(newMatchRows)

  // Recompute points to include the newly granted bye win
  if (byePlayerId) {
    await recomputeParticipantPoints(tournamentId)
  }

  // Activate tournament on the first generated round
  if (tournament.status === 'draft') {
    await db
      .update(tournaments)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(tournaments.id, tournamentId))
  }

  // Return the newly created round with player names
  const allMatchDetails = await queryMatchesWithNames(tournamentId)
  const roundMatches = allMatchDetails.filter(m => m.roundNumber === nextRoundNumber)

  return {
    roundNumber: nextRoundNumber,
    matches: roundMatches,
    isComplete: roundMatches.every(m => m.winnerPlayerId !== null),
  }
}

export async function setMatchResult(
  tournamentId: string,
  matchId: string,
  winnerPlayerId: string,
): Promise<MatchDetail> {
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .get()
  if (!tournament) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }
  if (tournament.status === 'finalized') {
    throw createError({ statusCode: 400, message: 'Tournament is already finalized' })
  }
  if (tournament.status === 'draft') {
    throw createError({ statusCode: 400, message: 'No rounds have been generated yet' })
  }

  const match = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.tournamentId, tournamentId)))
    .get()
  if (!match) {
    throw createError({ statusCode: 404, message: 'Match not found' })
  }
  if (match.isBye) {
    throw createError({ statusCode: 400, message: 'Bye matches cannot be manually updated' })
  }
  if (winnerPlayerId !== match.player1Id && winnerPlayerId !== match.player2Id) {
    throw createError({ statusCode: 400, message: 'Winner must be one of the match participants' })
  }

  await db
    .update(matches)
    .set({ winnerPlayerId, updatedAt: new Date() })
    .where(eq(matches.id, matchId))

  await recomputeParticipantPoints(tournamentId)

  // Return updated match with player names
  const updated = await db
    .select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      roundNumber: matches.roundNumber,
      player1Id: matches.player1Id,
      player1Name: p1.name,
      player2Id: matches.player2Id,
      player2Name: p2.name,
      winnerPlayerId: matches.winnerPlayerId,
      isBye: matches.isBye,
      createdAt: matches.createdAt,
      updatedAt: matches.updatedAt,
    })
    .from(matches)
    .leftJoin(p1, eq(matches.player1Id, p1.id))
    .leftJoin(p2, eq(matches.player2Id, p2.id))
    .where(eq(matches.id, matchId))
    .get()

  return updated as MatchDetail
}

export async function finalizeTournament(tournamentId: string) {
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .get()
  if (!tournament) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }
  if (tournament.status === 'finalized') {
    throw createError({ statusCode: 400, message: 'Tournament is already finalized' })
  }
  if (tournament.status === 'draft') {
    throw createError({ statusCode: 400, message: 'No rounds have been generated yet' })
  }

  // Manual mode: skip round checks, rank directly by pointsEarned
  if (tournament.entryMode === 'manual') {
    const participationRows = await db
      .select()
      .from(tournamentParticipations)
      .where(eq(tournamentParticipations.tournamentId, tournamentId))
      .all()

    if (participationRows.length === 0) {
      throw createError({ statusCode: 400, message: 'Il torneo non ha partecipanti da finalizzare' })
    }

    const sorted = [...participationRows].sort((a, b) => {
      if (b.pointsEarned !== a.pointsEarned) return b.pointsEarned - a.pointsEarned
      return a.id.localeCompare(b.id)
    })

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i]!
      await db
        .update(tournamentParticipations)
        .set({
          finalPlacement: i + 1,
          isWinner: i === 0,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tournamentParticipations.tournamentId, tournamentId),
          eq(tournamentParticipations.playerId, p.playerId),
        ))
    }

    const winner = sorted[0]
    await db
      .update(tournaments)
      .set({ status: 'finalized', winnerPlayerId: winner?.playerId ?? null, updatedAt: new Date() })
      .where(eq(tournaments.id, tournamentId))

    const playerRows = await db
      .select({ id: players.id, name: players.name })
      .from(players)
      .where(inArray(players.id, participationRows.map(p => p.playerId)))
      .all()
    const playerNameMap = new Map(playerRows.map(p => [p.id, p.name]))

    const finalTournamentManual = await getTournament(tournamentId)
    const discordStandingsManual = sorted.map((p, i) => ({
      placement: i + 1,
      playerName: playerNameMap.get(p.playerId) ?? p.playerId,
      points: p.pointsEarned,
      isWinner: i === 0,
    }))
    await sendTournamentResultToDiscord({
      tournamentName: finalTournamentManual.name,
      tournamentDate: finalTournamentManual.date,
      leagueName: finalTournamentManual.leagueName,
      standings: discordStandingsManual,
    })
    return finalTournamentManual
  }

  const matchRows = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .all()

  const existingRoundNumbers = [...new Set(matchRows.map(m => m.roundNumber))]
  if (existingRoundNumbers.length < tournament.roundCount) {
    throw createError({
      statusCode: 400,
      message: `Tournament requires ${tournament.roundCount} rounds but only ${existingRoundNumbers.length} have been generated`,
    })
  }

  const incompleteMatches = matchRows.filter(m => m.winnerPlayerId === null)
  if (incompleteMatches.length > 0) {
    throw createError({
      statusCode: 400,
      message: `${incompleteMatches.length} match(es) still need results before finalizing`,
    })
  }

  const participationRows = await db
    .select()
    .from(tournamentParticipations)
    .where(eq(tournamentParticipations.tournamentId, tournamentId))
    .all()

  if (participationRows.length === 0) {
    throw createError({ statusCode: 400, message: 'Tournament has no participants to finalize' })
  }

  const participantIds = participationRows.map(p => p.playerId)
  const rawOutcomes = buildOutcomes(
    matchRows.map(m => ({
      id: m.id,
      tournamentId: m.tournamentId,
      roundNumber: m.roundNumber,
      player1Id: m.player1Id,
      player1Name: null,
      player2Id: m.player2Id,
      player2Name: null,
      winnerPlayerId: m.winnerPlayerId,
      isBye: m.isBye,
      createdAt: m.createdAt as Date,
      updatedAt: m.updatedAt as Date,
    })),
  )
  const scores = computeScores(participantIds, rawOutcomes)
  const ranked = rankParticipants(scores)

  // Write final placements and winner flag to all participations
  for (const r of ranked) {
    await db
      .update(tournamentParticipations)
      .set({
        pointsEarned: r.points,
        finalPlacement: r.placement,
        isWinner: r.placement === 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tournamentParticipations.tournamentId, tournamentId),
          eq(tournamentParticipations.playerId, r.playerId),
        ),
      )
  }

  const winner = ranked.find(r => r.placement === 1)

  await db
    .update(tournaments)
    .set({
      status: 'finalized',
      winnerPlayerId: winner?.playerId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId))

  // Build player name map for Discord notification
  const participationRowsForDiscord = await db
    .select({ playerId: tournamentParticipations.playerId, playerName: players.name })
    .from(tournamentParticipations)
    .innerJoin(players, eq(tournamentParticipations.playerId, players.id))
    .where(eq(tournamentParticipations.tournamentId, tournamentId))
    .all()
  const playerNameMapManaged = new Map(participationRowsForDiscord.map(p => [p.playerId, p.playerName]))

  const finalTournament = await getTournament(tournamentId)
  const discordStandings = ranked.map(r => ({
    placement: r.placement,
    playerName: playerNameMapManaged.get(r.playerId) ?? r.playerId,
    points: r.points,
    isWinner: r.placement === 1,
  }))
  await sendTournamentResultToDiscord({
    tournamentName: finalTournament.name,
    tournamentDate: finalTournament.date,
    leagueName: finalTournament.leagueName,
    standings: discordStandings,
  })
  return finalTournament
}
