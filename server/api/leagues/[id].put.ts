import { updateLeague } from '../../services/league.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  return updateLeague(id, body)
})
