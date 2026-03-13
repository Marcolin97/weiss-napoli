import { listRoundsWithStandings } from '../../../services/rounds.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return listRoundsWithStandings(id)
})
