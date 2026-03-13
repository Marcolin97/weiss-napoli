import { computeLeagueStandings } from '../../../services/league-standings.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return computeLeagueStandings(id)
})
