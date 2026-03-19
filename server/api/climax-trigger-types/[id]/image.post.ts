import { readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/index'
import { climaxTriggerTypes } from '../../../db/schema'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const existing = await db.select().from(climaxTriggerTypes).where(eq(climaxTriggerTypes.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Tipo trigger non trovato' })
  }

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(p => p.name === 'image')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, message: 'Nessun file immagine ricevuto' })
  }

  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'Il file supera i 2 MB consentiti' })
  }

  const originalName = filePart.filename ?? 'upload'
  const ext = extname(originalName).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw createError({ statusCode: 400, message: 'Formato file non supportato. Usa JPG, PNG, GIF, WEBP o SVG.' })
  }

  const filename = `${id}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'climax')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), filePart.data)

  const imageUrl = `/uploads/climax/${filename}`
  const [updated] = await db
    .update(climaxTriggerTypes)
    .set({ imageUrl })
    .where(eq(climaxTriggerTypes.id, id))
    .returning()

  return updated!
})
