import { updateClimaxTriggerType } from '../../../services/climax.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ label: string; name?: string }>(event)
  return updateClimaxTriggerType(id, body)
})
