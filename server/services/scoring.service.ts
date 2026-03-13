/**
 * Scoring and ranking logic for tournaments.
 *
 * All business rules for point calculation and placement live here.
 * Extend `rankParticipants` tie-break logic as new rules are added.
 */

import { POINTS_PER_WIN } from '../../types/domain'

export interface MatchOutcome {
  playerId: string
  outcome: 'win' | 'loss' | 'bye'
}

export interface ParticipantScore {
  playerId: string
  wins: number
  losses: number
  byes: number
  points: number
}

export interface RankedParticipant extends ParticipantScore {
  placement: number
}

/**
 * Build per-player scores from a list of resolved match outcomes.
 * Each win = POINTS_PER_WIN, bye = POINTS_PER_WIN, loss = 0.
 */
export function computeScores(
  participantIds: string[],
  outcomes: MatchOutcome[],
): ParticipantScore[] {
  const scoreMap = new Map<string, ParticipantScore>(
    participantIds.map(id => [id, { playerId: id, wins: 0, losses: 0, byes: 0, points: 0 }]),
  )

  for (const outcome of outcomes) {
    const score = scoreMap.get(outcome.playerId)
    if (!score) continue
    if (outcome.outcome === 'win') {
      score.wins++
      score.points += POINTS_PER_WIN
    }
    else if (outcome.outcome === 'bye') {
      score.byes++
      score.points += POINTS_PER_WIN // bye counts as a win per domain rules
    }
    else {
      score.losses++
    }
  }

  return Array.from(scoreMap.values())
}

/**
 * Rank participants by tournament points.
 *
 * Tie-break order (extend here for richer logic later):
 *   1. Points DESC
 *   2. Wins DESC  (same points via byes is worth less than via wins)
 *   3. Byes ASC   (fewer byes = better when wins are equal)
 *   4. playerId ASC (stable deterministic fallback)
 */
export function rankParticipants(scores: ParticipantScore[]): RankedParticipant[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.byes !== b.byes) return a.byes - b.byes
    // Extend here: add opponent-score tie-break, head-to-head, etc.
    return a.playerId.localeCompare(b.playerId)
  })

  return sorted.map((s, i) => ({ ...s, placement: i + 1 }))
}
