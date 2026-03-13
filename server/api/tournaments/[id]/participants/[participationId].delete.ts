import { removeParticipant } from '../../../../services/tournament.service'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')!
  const participationId = getRouterParam(event, 'participationId')!
  return removeParticipant(tournamentId, participationId)
})
