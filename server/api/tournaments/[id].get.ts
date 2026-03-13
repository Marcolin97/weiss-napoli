import { getTournament } from '../../services/tournament.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return getTournament(id)
})
