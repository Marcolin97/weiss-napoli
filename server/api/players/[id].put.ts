import { updatePlayer } from '../../services/player.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  return updatePlayer(id, body)
})
