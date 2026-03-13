<template>
  <div>
    <div ref="headerRef" class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Giocatori</h1>
        <p class="text-muted text-sm">Profili riutilizzabili condivisi tra tutti i tornei.</p>
      </div>
      <UButton label="Nuovo giocatore" icon="i-lucide-plus" @click="openCreate" />
    </div>

    <UCard>
      <UTable
        :data="players ?? []"
        :columns="columns"
        :loading="status === 'pending'"
        empty="Nessun giocatore ancora."
      >
        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/players/${row.original.id}`"
            class="font-medium hover:underline"
          >
            {{ row.original.name }}
          </NuxtLink>
        </template>

        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              :to="`/players/${row.original.id}`"
              icon="i-lucide-eye"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Vedi giocatore"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Create modal -->
    <UModal v-model:open="isCreateOpen" title="Nuovo giocatore">
      <template #body>
        <PlayerForm
          @saved="onPlayerSaved"
          @cancel="isCreateOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import type { Player } from '~/types/domain'

const { data: players, status, refresh } = await useFetch<Player[]>('/api/players')

const isCreateOpen = ref(false)
const headerRef = ref<HTMLElement | null>(null)
const { fadeIn } = useAnime()

onMounted(() => {
  if (headerRef.value) fadeIn(headerRef.value)
})

const columns: ColumnDef<Player>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'createdAt', header: 'Registrato' },
  { id: 'actions', header: '' },
]

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function openCreate() {
  isCreateOpen.value = true
}

async function onPlayerSaved() {
  isCreateOpen.value = false
  await refresh()
}
</script>

