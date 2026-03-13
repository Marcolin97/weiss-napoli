import { createTournament } from '../../../services/tournament.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  return createTournament(id, body)
})
