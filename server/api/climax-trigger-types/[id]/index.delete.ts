import { deleteClimaxTriggerType } from '../../../services/climax.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return deleteClimaxTriggerType(id)
})
