import type { Tournament, ParticipantDetail, RoundSummary, MatchDetail, TournamentWithLeague } from '~/types/domain'

export function useTournament() {
  const toast = useToast()

  async function createTournament(
    leagueId: string,
    data: { name: string; date: string; roundCount: number; entryMode?: 'managed' | 'manual' },
  ): Promise<Tournament> {
    try {
      const result = await $fetch<Tournament>(`/api/leagues/${leagueId}/tournaments`, {
        method: 'POST',
        body: data,
      })
      toast.add({ title: 'Tournament created', icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to create tournament'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function addParticipant(
    tournamentId: string,
    data: { playerId: string; climaxTriggerTypeId: string; climaxTriggerTypeId2: string },
  ): Promise<ParticipantDetail> {
    try {
      const result = await $fetch<ParticipantDetail>(`/api/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        body: data,
      })
      toast.add({ title: 'Participant added', icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to add participant'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function removeParticipant(tournamentId: string, participationId: string): Promise<void> {
    try {
      await $fetch(`/api/tournaments/${tournamentId}/participants/${participationId}`, {
        method: 'DELETE',
      })
      toast.add({ title: 'Participant removed', icon: 'i-lucide-check-circle', color: 'green' })
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to remove participant'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function generateRound(tournamentId: string): Promise<RoundSummary> {
    try {
      const result = await $fetch<RoundSummary>(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
      })
      toast.add({ title: `Round ${result.roundNumber} generated`, icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to generate round'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function setMatchResult(tournamentId: string, matchId: string, winnerPlayerId: string): Promise<MatchDetail> {
    try {
      return await $fetch<MatchDetail>(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PUT',
        body: { winnerPlayerId },
      })
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to register result'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function finalizeTournament(tournamentId: string): Promise<TournamentWithLeague> {
    try {
      const result = await $fetch<TournamentWithLeague>(`/api/tournaments/${tournamentId}/finalize`, {
        method: 'POST',
      })
      toast.add({ title: 'Tournament finalized!', icon: 'i-lucide-flag', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to finalize tournament'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function setManualResults(
    tournamentId: string,
    results: Array<{ participationId: string; wins: number; losses: number }>,
  ): Promise<ParticipantDetail[]> {
    try {
      const res = await $fetch<ParticipantDetail[]>(`/api/tournaments/${tournamentId}/manual-results`, {
        method: 'PUT',
        body: { results },
      })
      toast.add({ title: 'Risultati salvati', icon: 'i-lucide-check-circle', color: 'green' })
      return res
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Errore nel salvataggio dei risultati'
      toast.add({ title: 'Errore', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  return { createTournament, addParticipant, removeParticipant, generateRound, setMatchResult, finalizeTournament, setManualResults }
}
