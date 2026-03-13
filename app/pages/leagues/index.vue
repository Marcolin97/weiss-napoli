<template>
  <div>
    <div ref="headerRef" class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Leghe</h1>
        <p class="text-muted text-sm">Organizza i tornei e monitora le classifiche.</p>
      </div>
      <UButton label="Nuova lega" icon="i-lucide-plus" @click="openCreate" />
    </div>

    <UCard>
      <UTable
        :data="leagues ?? []"
        :columns="columns"
        :loading="status === 'pending'"
        empty="Nessuna lega ancora."
      >
        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/leagues/${row.original.id}`"
            class="font-medium hover:underline"
          >
            {{ row.original.name }}
          </NuxtLink>
        </template>

        <template #description-cell="{ row }">
          <span class="text-muted text-sm">{{ row.original.description ?? '—' }}</span>
        </template>

        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              :to="`/leagues/${row.original.id}`"
              icon="i-lucide-eye"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Vedi lega"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Create modal -->
    <UModal v-model:open="isCreateOpen" title="Nuova lega">
      <template #body>
        <LeagueForm
          @saved="onLeagueSaved"
          @cancel="isCreateOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import type { League } from '~/types/domain'

const { data: leagues, status, refresh } = await useFetch<League[]>('/api/leagues')

const isCreateOpen = ref(false)
const headerRef = ref<HTMLElement | null>(null)
const { fadeIn } = useAnime()

onMounted(() => {
  if (headerRef.value) fadeIn(headerRef.value)
})

const columns: ColumnDef<League>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'description', header: 'Descrizione' },
  { accessorKey: 'createdAt', header: 'Creata' },
  { id: 'actions', header: '' },
]

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function openCreate() {
  isCreateOpen.value = true
}

async function onLeagueSaved() {
  isCreateOpen.value = false
  await refresh()
}
</script>

