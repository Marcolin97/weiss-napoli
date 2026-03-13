import { createError } from 'h3'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../../db/index'
import { players, tournaments, tournamentParticipations, leagues } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const player = await db.select().from(players).where(eq(players.id, id)).get()
  if (!player) throw createError({ statusCode: 404, message: 'Giocatore non trovato' })

  const rows = await db
    .select({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentDate: tournaments.date,
      tournamentStatus: tournaments.status,
      leagueId: leagues.id,
      leagueName: leagues.name,
      pointsEarned: tournamentParticipations.pointsEarned,
      finalPlacement: tournamentParticipations.finalPlacement,
      isWinner: tournamentParticipations.isWinner,
    })
    .from(tournamentParticipations)
    .innerJoin(tournaments, eq(tournamentParticipations.tournamentId, tournaments.id))
    .innerJoin(leagues, eq(tournaments.leagueId, leagues.id))
    .where(eq(tournamentParticipations.playerId, id))
    .orderBy(desc(tournaments.date), desc(tournaments.createdAt))
    .all()

  return rows
})