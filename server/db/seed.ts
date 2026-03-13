import { db } from './index'
import { climaxTriggerTypes } from './schema'

// Standard Weiss Schwarz climax trigger types (controlled set)
const SEED_TRIGGER_TYPES = [
  { id: 'soul', name: 'soul', label: 'Soul' },
  { id: 'stock', name: 'stock', label: 'Stock' },
  { id: 'gate', name: 'gate', label: 'Gate' },
  { id: 'door', name: 'door', label: 'Door' },
  { id: 'comeback', name: 'comeback', label: 'Comeback' },
  { id: 'treasure', name: 'treasure', label: 'Treasure' },
  { id: 'clock', name: 'clock', label: 'Clock' },
  { id: 'shot', name: 'shot', label: 'Shot' },
  { id: 'wind', name: 'wind', label: 'Wind' },
  { id: 'bag', name: 'bag', label: 'Bag' },
  { id: 'book', name: 'book', label: 'Book' },
  { id: 'bounce', name: 'bounce', label: 'Bounce' },
] as const

export async function seedClimaxTriggerTypes(): Promise<void> {
  const existing = await db.select().from(climaxTriggerTypes).all()
  if (existing.length > 0) return

  await db.insert(climaxTriggerTypes).values([...SEED_TRIGGER_TYPES])
  console.log(`[db:seed] Inserted ${SEED_TRIGGER_TYPES.length} climax trigger types`)
}
