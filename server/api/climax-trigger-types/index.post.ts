import { createClimaxTriggerType } from '../../services/climax.service'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ label: string; name?: string }>(event)
  return createClimaxTriggerType(body)
})
