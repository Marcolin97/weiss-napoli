import { createError } from 'h3'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db/index'
import { leagues } from '../db/schema'

export interface CreateLeagueInput {
  name: string
  description?: string
}

export interface UpdateLeagueInput {
  name: string
  description?: string
}

interface ValidatedLeagueFields {
  name: string
  description: string | null
}

function validateLeagueInput(input: CreateLeagueInput | UpdateLeagueInput): ValidatedLeagueFields {
  if (typeof input?.name !== 'string' || !input.name.trim()) {
    throw createError({ statusCode: 400, message: 'League name is required' })
  }
  if (input.name.trim().length > 100) {
    throw createError({ statusCode: 400, message: 'League name must be 100 characters or less' })
  }
  const description = typeof input.description === 'string' && input.description.trim()
    ? input.description.trim()
    : null
  if (description && description.length > 500) {
    throw createError({ statusCode: 400, message: 'Description must be 500 characters or less' })
  }
  return { name: input.name.trim(), description }
}

export async function listLeagues() {
  return db.select().from(leagues).orderBy(asc(leagues.name)).all()
}

export async function getLeague(id: string) {
  const row = await db.select().from(leagues).where(eq(leagues.id, id)).get()
  if (!row) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }
  return row
}

export async function createLeague(input: CreateLeagueInput) {
  const { name, description } = validateLeagueInput(input)
  const [row] = await db
    .insert(leagues)
    .values({ id: crypto.randomUUID(), name, description })
    .returning()
  return row!
}

export async function updateLeague(id: string, input: UpdateLeagueInput) {
  await getLeague(id)
  const { name, description } = validateLeagueInput(input)
  const [row] = await db
    .update(leagues)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(leagues.id, id))
    .returning()
  return row!
}
