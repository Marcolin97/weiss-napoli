import { setManualResults } from '../../../services/tournament.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ results: Array<{ participationId: string; wins: number; losses: number }> }>(event)
  if (!Array.isArray(body?.results)) {
    throw createError({ statusCode: 400, message: 'results array is required' })
  }
  return setManualResults(id, body.results)
})