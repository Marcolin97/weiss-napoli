import { setMatchResult } from '../../../../services/rounds.service'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')!
  const matchId = getRouterParam(event, 'matchId')!
  const body = await readBody<{ winnerPlayerId: string }>(event)

  if (!body?.winnerPlayerId) {
    throw createError({ statusCode: 400, message: 'winnerPlayerId is required' })
  }

  return setMatchResult(tournamentId, matchId, body.winnerPlayerId)
})
