/**
 * Pairing logic for tournament rounds.
 *
 * Implements score-based TCG pairing, isolated from DB concerns so it can be
 * replaced with a formal Swiss implementation without touching service plumbing.
 *
 * Rules applied:
 * - Round 1: sort by playerId for deterministic output (no point history yet)
 * - Round 2+: sort by currentPoints DESC, then playerId for stability
 * - Bye (odd count): lowest-ranked player with the fewest accumulated byes
 * - Repeat avoidance: greedy — skip already-played opponents when possible,
 *   fall back to nearest if all have already been paired
 */

export interface PairingParticipant {
  playerId: string
  currentPoints: number
  byeCount: number
}

export interface PairingResult {
  pairs: Array<{ player1Id: string; player2Id: string }>
  byePlayerId: string | null
}

export function generatePairings(
  participants: PairingParticipant[],
  previousPairings: Array<{ player1Id: string; player2Id: string }>,
  roundNumber: number,
): PairingResult {
  if (participants.length === 0) return { pairs: [], byePlayerId: null }

  const sorted = sortParticipants(participants, roundNumber)
  let pool = [...sorted]
  let byePlayerId: string | null = null

  if (pool.length % 2 !== 0) {
    byePlayerId = selectByePlayer(pool)
    pool = pool.filter(p => p.playerId !== byePlayerId)
  }

  const playedSet = buildPlayedSet(previousPairings)
  const pairs = greedyPair(pool, playedSet)

  return { pairs, byePlayerId }
}

function sortParticipants(participants: PairingParticipant[], roundNumber: number): PairingParticipant[] {
  return [...participants].sort((a, b) => {
    if (roundNumber > 1 && b.currentPoints !== a.currentPoints) {
      return b.currentPoints - a.currentPoints
    }
    return a.playerId.localeCompare(b.playerId)
  })
}

/** Pick the bye candidate: bottom of standings with fewest accumulated byes. */
function selectByePlayer(sorted: PairingParticipant[]): string {
  const minByes = Math.min(...sorted.map(p => p.byeCount))
  const candidate = [...sorted].reverse().find(p => p.byeCount === minByes)
  return candidate!.playerId
}

function buildPlayedSet(previousPairings: Array<{ player1Id: string; player2Id: string }>): Set<string> {
  return new Set(previousPairings.map(p => pairKey(p.player1Id, p.player2Id)))
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

function greedyPair(
  players: PairingParticipant[],
  playedSet: Set<string>,
): Array<{ player1Id: string; player2Id: string }> {
  const result: Array<{ player1Id: string; player2Id: string }> = []
  const remaining = [...players]

  while (remaining.length >= 2) {
    const first = remaining.shift()!
    // Prefer an opponent not yet played; fall back to the nearest if unavoidable
    let opponentIdx = remaining.findIndex(
      p => !playedSet.has(pairKey(first.playerId, p.playerId)),
    )
    if (opponentIdx === -1) opponentIdx = 0
    const [opponent] = remaining.splice(opponentIdx, 1)
    result.push({ player1Id: first.playerId, player2Id: opponent.playerId })
  }

  return result
}
