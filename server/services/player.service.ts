import { createError } from 'h3'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db/index'
import { players } from '../db/schema'

export interface CreatePlayerInput {
  name: string
}

export interface UpdatePlayerInput {
  name: string
}

function validateName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, message: 'Player name is required' })
  }
  if (value.trim().length > 100) {
    throw createError({ statusCode: 400, message: 'Player name must be 100 characters or less' })
  }
  return value.trim()
}

export async function listPlayers() {
  return db.select().from(players).orderBy(asc(players.name)).all()
}

export async function getPlayer(id: string) {
  const row = await db.select().from(players).where(eq(players.id, id)).get()
  if (!row) {
    throw createError({ statusCode: 404, message: 'Player not found' })
  }
  return row
}

export async function createPlayer(input: CreatePlayerInput) {
  const name = validateName(input?.name)
  const [row] = await db
    .insert(players)
    .values({ id: crypto.randomUUID(), name })
    .returning()
  return row!
}

export async function updatePlayer(id: string, input: UpdatePlayerInput) {
  await getPlayer(id)
  const name = validateName(input?.name)
  const [row] = await db
    .update(players)
    .set({ name, updatedAt: new Date() })
    .where(eq(players.id, id))
    .returning()
  return row!
}
