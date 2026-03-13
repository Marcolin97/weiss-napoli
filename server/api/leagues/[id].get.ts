import { getLeague } from '../../services/league.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return getLeague(id)
})
