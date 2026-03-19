/**
 * Proxy for EncoreDecks neosets API.
 * Fetches the full set list and returns it filtered to WS game only.
 * Cached for 1 hour to avoid hammering the external API.
 */

let cachedSets: EncoreDeckSet[] | null = null
let cacheExpiresAt = 0

export interface EncoreDeckSet {
  _id: string
  name: string
  game: string
  setcodes: string[]
}

export default defineEventHandler(async (): Promise<EncoreDeckSet[]> => {
  const now = Date.now()
  if (cachedSets && now < cacheExpiresAt) {
    return cachedSets
  }

  const raw = await $fetch<EncoreDeckSet[]>('https://www.encoredecks.com/api/neosets', {
    headers: { Accept: 'application/json' },
  })

  const sets = raw
    .filter(s => s.game === 'WS')
    .sort((a, b) => a.name.localeCompare(b.name))

  cachedSets = sets
  cacheExpiresAt = now + 60 * 60 * 1000 // 1 hour
  return sets
})
