import type { Player } from '~/types/domain'

export function usePlayer() {
  const toast = useToast()

  async function createPlayer(data: { name: string }): Promise<Player> {
    try {
      const result = await $fetch<Player>('/api/players', { method: 'POST', body: data })
      toast.add({ title: 'Player created', icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to create player'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function updatePlayer(id: string, data: { name: string }): Promise<Player> {
    try {
      const result = await $fetch<Player>(`/api/players/${id}`, { method: 'PUT', body: data })
      toast.add({ title: 'Player updated', icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to update player'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  return { createPlayer, updatePlayer }
}
