import { createError } from 'h3'
import { eq, asc, count, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '../db/index'
import { tournaments, tournamentParticipations, players, leagues, climaxTriggerTypes } from '../db/schema'
import { POINTS_PER_WIN, type TournamentEntryMode } from '../../types/domain'

const ct2 = alias(climaxTriggerTypes, 'ct2')

export interface CreateTournamentInput {
  name: string
  date: string
  roundCount: number
  entryMode?: TournamentEntryMode
}

export interface AddParticipantInput {
  playerId: string
  climaxTriggerTypeId: string
  climaxTriggerTypeId2: string
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateRoundCount(value: unknown): 3 | 4 {
  if (value !== 3 && value !== 4) {
    throw createError({ statusCode: 400, message: 'Round count must be exactly 3 or 4' })
  }
  return value as 3 | 4
}

function validateDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, message: 'Tournament date is required' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw createError({ statusCode: 400, message: 'Tournament date must be in YYYY-MM-DD format' })
  }
  if (isNaN(new Date(value.trim()).getTime())) {
    throw createError({ statusCode: 400, message: 'Tournament date is not valid' })
  }
  return value.trim()
}

// ─── Tournament queries ───────────────────────────────────────────────────────

export async function listTournamentsByLeague(leagueId: string) {
  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.leagueId, leagueId))
    .orderBy(asc(tournaments.date), asc(tournaments.createdAt))
    .all()
}

export async function getTournament(id: string) {
  const row = await db
    .select({
      id: tournaments.id,
      leagueId: tournaments.leagueId,
      leagueName: leagues.name,
      name: tournaments.name,
      date: tournaments.date,
      roundCount: tournaments.roundCount,
      pairBlockIndex: tournaments.pairBlockIndex,
      status: tournaments.status,
      entryMode: tournaments.entryMode,
      winnerPlayerId: tournaments.winnerPlayerId,
      createdAt: tournaments.createdAt,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .innerJoin(leagues, eq(tournaments.leagueId, leagues.id))
    .where(eq(tournaments.id, id))
    .get()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }
  return row
}

export async function createTournament(leagueId: string, input: CreateTournamentInput) {
  const league = await db.select().from(leagues).where(eq(leagues.id, leagueId)).get()
  if (!league) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }

  if (typeof input?.name !== 'string' || !input.name.trim()) {
    throw createError({ statusCode: 400, message: 'Tournament name is required' })
  }
  if (input.name.trim().length > 100) {
    throw createError({ statusCode: 400, message: 'Tournament name must be 100 characters or less' })
  }

  const date = validateDate(input?.date)
  const roundCount = validateRoundCount(input?.roundCount)

  // Auto-assign pair block: every 2 consecutive tournaments share a block (1-based)
  const countResult = await db
    .select({ value: count() })
    .from(tournaments)
    .where(eq(tournaments.leagueId, leagueId))
  const existingCount = Number(countResult[0]?.value ?? 0)
  const pairBlockIndex = Math.ceil((existingCount + 1) / 2)

  const [row] = await db
    .insert(tournaments)
    .values({
      id: crypto.randomUUID(),
      leagueId,
      name: input.name.trim(),
      date,
      roundCount,
      pairBlockIndex,
      status: 'draft',
      entryMode: input.entryMode ?? 'managed',
    })
    .returning()
  return row!
}

// ─── Participant queries ──────────────────────────────────────────────────────

export async function listParticipants(tournamentId: string) {
  return db
    .select({
      id: tournamentParticipations.id,
      tournamentId: tournamentParticipations.tournamentId,
      playerId: tournamentParticipations.playerId,
      playerName: players.name,
      climaxTriggerTypeId: tournamentParticipations.climaxTriggerTypeId,
      triggerTypeName: climaxTriggerTypes.name,
      triggerTypeLabel: climaxTriggerTypes.label,
      climaxTriggerTypeId2: tournamentParticipations.climaxTriggerTypeId2,
      triggerTypeName2: ct2.name,
      triggerTypeLabel2: ct2.label,
      pointsEarned: tournamentParticipations.pointsEarned,
      finalPlacement: tournamentParticipations.finalPlacement,
      isWinner: tournamentParticipations.isWinner,
      wasAbsent: tournamentParticipations.wasAbsent,
      createdAt: tournamentParticipations.createdAt,
      updatedAt: tournamentParticipations.updatedAt,
    })
    .from(tournamentParticipations)
    .innerJoin(players, eq(tournamentParticipations.playerId, players.id))
    .innerJoin(
      climaxTriggerTypes,
      eq(tournamentParticipations.climaxTriggerTypeId, climaxTriggerTypes.id),
    )
    .leftJoin(ct2, eq(tournamentParticipations.climaxTriggerTypeId2, ct2.id))
    .where(eq(tournamentParticipations.tournamentId, tournamentId))
    .orderBy(asc(players.name))
    .all()
}

export async function addParticipant(tournamentId: string, input: AddParticipantInput) {
  const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
  if (!tournament) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }
  if (tournament.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Can only add participants to a draft tournament' })
  }

  if (!input?.playerId) {
    throw createError({ statusCode: 400, message: 'Player is required' })
  }
  const player = await db.select().from(players).where(eq(players.id, input.playerId)).get()
  if (!player) {
    throw createError({ statusCode: 404, message: 'Player not found' })
  }

  if (!input?.climaxTriggerTypeId) {
    throw createError({ statusCode: 400, message: 'Climax trigger type is required' })
  }
  const triggerType = await db
    .select()
    .from(climaxTriggerTypes)
    .where(eq(climaxTriggerTypes.id, input.climaxTriggerTypeId))
    .get()
  if (!triggerType) {
    throw createError({ statusCode: 400, message: 'Climax trigger type not found' })
  }

  if (!input?.climaxTriggerTypeId2) {
    throw createError({ statusCode: 400, message: 'Second climax trigger type is required' })
  }
  const triggerType2 = await db
    .select()
    .from(climaxTriggerTypes)
    .where(eq(climaxTriggerTypes.id, input.climaxTriggerTypeId2))
    .get()
  if (!triggerType2) {
    throw createError({ statusCode: 400, message: 'Second climax trigger type not found' })
  }

  const existing = await db
    .select()
    .from(tournamentParticipations)
    .where(
      and(
        eq(tournamentParticipations.tournamentId, tournamentId),
        eq(tournamentParticipations.playerId, input.playerId),
      ),
    )
    .get()

  if (existing) {
    throw createError({ statusCode: 409, message: `${player.name} is already registered in this tournament` })
  }

  const [row] = await db
    .insert(tournamentParticipations)
    .values({
      id: crypto.randomUUID(),
      tournamentId,
      playerId: input.playerId,
      climaxTriggerTypeId: input.climaxTriggerTypeId,
      climaxTriggerTypeId2: input.climaxTriggerTypeId2,
      pointsEarned: 0,
      isWinner: false,
      wasAbsent: false,
    })
    .returning()
  return row!
}

export async function removeParticipant(tournamentId: string, participationId: string) {
  const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
  if (!tournament) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }
  if (tournament.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Can only remove participants from a draft tournament' })
  }

  const [deleted] = await db
    .delete(tournamentParticipations)
    .where(
      and(
        eq(tournamentParticipations.id, participationId),
        eq(tournamentParticipations.tournamentId, tournamentId),
      ),
    )
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Participant not found' })
  }
  return deleted
}

// ─── Manual results ───────────────────────────────────────────────────────────

export interface ManualParticipantResult {
  participationId: string
  wins: number
  losses: number
}

export async function setManualResults(tournamentId: string, results: ManualParticipantResult[]) {
  const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
  if (!tournament) throw createError({ statusCode: 404, message: 'Torneo non trovato' })
  if (tournament.entryMode !== 'manual') throw createError({ statusCode: 400, message: 'Il torneo non è in modalità manuale' })
  if (tournament.status === 'finalized') throw createError({ statusCode: 400, message: 'Il torneo è già finalizzato' })

  for (const r of results) {
    const points = r.wins * POINTS_PER_WIN
    await db
      .update(tournamentParticipations)
      .set({ pointsEarned: points, updatedAt: new Date() })
      .where(and(
        eq(tournamentParticipations.id, r.participationId),
        eq(tournamentParticipations.tournamentId, tournamentId),
      ))
  }

  // Mark as active if still draft
  if (tournament.status === 'draft') {
    await db.update(tournaments).set({ status: 'active', updatedAt: new Date() }).where(eq(tournaments.id, tournamentId))
  }

  return listParticipants(tournamentId)
}
