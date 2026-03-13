import { getPlayer } from '../../services/player.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return getPlayer(id)
})
