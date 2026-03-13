import { createPlayer } from '../../services/player.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return createPlayer(body)
})
