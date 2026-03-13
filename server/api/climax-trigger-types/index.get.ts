import { db } from '../../db/index'
import { climaxTriggerTypes } from '../../db/schema'

export default defineEventHandler(async () => {
  return await db.select().from(climaxTriggerTypes).all()
})
