import type { League } from '~/types/domain'

export function useLeague() {
  const toast = useToast()

  async function createLeague(data: { name: string; description?: string }): Promise<League> {
    try {
      const result = await $fetch<League>('/api/leagues', { method: 'POST', body: data })
      toast.add({ title: 'League created', icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to create league'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  async function updateLeague(id: string, data: { name: string; description?: string }): Promise<League> {
    try {
      const result = await $fetch<League>(`/api/leagues/${id}`, { method: 'PUT', body: data })
      toast.add({ title: 'League updated', icon: 'i-lucide-check-circle', color: 'green' })
      return result
    }
    catch (e: unknown) {
      const message = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to update league'
      toast.add({ title: 'Error', description: message, icon: 'i-lucide-x-circle', color: 'red' })
      throw e
    }
  }

  return { createLeague, updateLeague }
}
