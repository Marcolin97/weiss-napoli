import { listParticipants } from '../../../services/tournament.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return listParticipants(id)
})
