import { softDeletePlayer } from '../../services/player.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return softDeletePlayer(id)
})
