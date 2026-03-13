import { createError } from 'h3'
import { eq, and, ne, count } from 'drizzle-orm'
import { db } from '../db/index'
import { climaxTriggerTypes, tournamentParticipations } from '../db/schema'

export interface ClimaxTriggerTypeInput {
  label: string
  name?: string
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function validateLabel(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, message: 'Il nome visualizzato è obbligatorio' })
  }
  if (value.trim().length > 50) {
    throw createError({ statusCode: 400, message: 'Il nome visualizzato deve essere al massimo 50 caratteri' })
  }
  return value.trim()
}

export async function listClimaxTriggerTypes() {
  return db.select().from(climaxTriggerTypes).all()
}

export async function createClimaxTriggerType(input: ClimaxTriggerTypeInput) {
  const label = validateLabel(input?.label)
  const name = input.name?.trim() ? slugify(input.name) : slugify(label)

  if (!name) {
    throw createError({ statusCode: 400, message: 'Impossibile generare un identificatore valido dal nome' })
  }

  const existing = await db.select().from(climaxTriggerTypes).where(eq(climaxTriggerTypes.name, name)).get()
  if (existing) {
    throw createError({ statusCode: 409, message: `Un tipo trigger con identificatore "${name}" esiste già` })
  }

  const [row] = await db
    .insert(climaxTriggerTypes)
    .values({ id: crypto.randomUUID(), name, label })
    .returning()
  return row!
}

export async function updateClimaxTriggerType(id: string, input: ClimaxTriggerTypeInput) {
  const existing = await db.select().from(climaxTriggerTypes).where(eq(climaxTriggerTypes.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Tipo trigger non trovato' })
  }

  const label = validateLabel(input?.label)
  const name = input.name?.trim() ? slugify(input.name) : existing.name

  // Check uniqueness of name excluding current record
  const conflict = await db
    .select()
    .from(climaxTriggerTypes)
    .where(and(eq(climaxTriggerTypes.name, name), ne(climaxTriggerTypes.id, id)))
    .get()
  if (conflict) {
    throw createError({ statusCode: 409, message: `Un tipo trigger con identificatore "${name}" esiste già` })
  }

  const [updated] = await db
    .update(climaxTriggerTypes)
    .set({ name, label })
    .where(eq(climaxTriggerTypes.id, id))
    .returning()
  return updated!
}

export async function deleteClimaxTriggerType(id: string) {
  const existing = await db.select().from(climaxTriggerTypes).where(eq(climaxTriggerTypes.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Tipo trigger non trovato' })
  }

  // Block deletion if used in any participation (primary or secondary trigger)
  const usageResult = await db
    .select({ value: count() })
    .from(tournamentParticipations)
    .where(eq(tournamentParticipations.climaxTriggerTypeId, id))
  const usage = Number(usageResult[0]?.value ?? 0)
  if (usage > 0) {
    throw createError({
      statusCode: 409,
      message: `Impossibile eliminare: questo tipo trigger è usato in ${usage} partecipazione${usage !== 1 ? 'i' : ''}`,
    })
  }

  const [deleted] = await db
    .delete(climaxTriggerTypes)
    .where(eq(climaxTriggerTypes.id, id))
    .returning()
  return deleted!
}
