import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/index'
import { climaxTriggerTypes } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const existing = await db.select().from(climaxTriggerTypes).where(eq(climaxTriggerTypes.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Tipo trigger non trovato' })
  }
  if (!existing.imageUrl) {
    throw createError({ statusCode: 404, message: 'Nessuna immagine da rimuovere' })
  }

  // Delete file from disk
  const filePath = join(process.cwd(), 'public', existing.imageUrl)
  try {
    await unlink(filePath)
  } catch {
    // File might not exist on disk — continue to clear the DB field
  }

  const [updated] = await db
    .update(climaxTriggerTypes)
    .set({ imageUrl: null })
    .where(eq(climaxTriggerTypes.id, id))
    .returning()

  return updated!
})
