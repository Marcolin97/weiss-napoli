import { createLeague } from '../../services/league.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return createLeague(body)
})
