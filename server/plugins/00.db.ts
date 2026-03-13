import { initializeDatabase } from '../db/index'
import { seedClimaxTriggerTypes } from '../db/seed'

// Runs before any other server plugin (prefix 00 ensures first execution)
export default defineNitroPlugin(async () => {
  await initializeDatabase()
  await seedClimaxTriggerTypes()
  console.log('[db] Database ready')
})
