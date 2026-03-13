<template>
  <div v-if="player">
    <div ref="headerRef" class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <UButton
          to="/players"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Torna ai giocatori"
        />
        <div>
          <h1 class="text-2xl font-bold">{{ player.name }}</h1>
          <p class="text-muted text-sm">Registrato {{ formatDate(player.createdAt) }}</p>
        </div>
      </div>
      <UButton label="Modifica" icon="i-lucide-pencil" variant="soft" @click="openEdit" />
    </div>

    <div class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user" class="text-primary" />
            <span class="font-semibold">Info giocatore</span>
          </div>
        </template>

        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-muted mb-1">Nome</dt>
            <dd class="font-medium">{{ player.name }}</dd>
          </div>
          <div>
            <dt class="text-muted mb-1">Membro dal</dt>
            <dd class="font-medium">{{ formatDate(player.createdAt) }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="text-primary" />
            <span class="font-semibold">Storico tornei</span>
          </div>
        </template>

        <div v-if="history && history.length > 0">
          <UTable :data="history" :columns="historyColumns">
            <template #tournamentName-cell="{ row }">
              <NuxtLink
                :to="`/tournaments/${row.original.tournamentId}`"
                class="font-medium hover:underline"
              >
                {{ row.original.tournamentName }}
              </NuxtLink>
            </template>
            <template #leagueName-cell="{ row }">
              <NuxtLink
                :to="`/leagues/${row.original.leagueId}`"
                class="hover:underline text-primary"
              >
                {{ row.original.leagueName }}
              </NuxtLink>
            </template>
            <template #tournamentDate-cell="{ row }">
              <span>{{ formatDate(row.original.tournamentDate) }}</span>
            </template>
            <template #pointsEarned-cell="{ row }">
              <span class="font-mono font-semibold">{{ row.original.pointsEarned }}</span>
            </template>
            <template #finalPlacement-cell="{ row }">
              <UBadge
                v-if="row.original.finalPlacement"
                :label="`#${row.original.finalPlacement}`"
                :color="row.original.finalPlacement === 1 ? 'yellow' : 'neutral'"
                variant="soft"
                size="sm"
              />
              <span v-else class="text-muted">—</span>
            </template>
            <template #isWinner-cell="{ row }">
              <UIcon
                v-if="row.original.isWinner"
                name="i-lucide-star"
                class="text-yellow-500"
                title="Vincitore torneo"
              />
            </template>
          </UTable>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-10 text-center gap-2">
          <UIcon name="i-lucide-calendar" class="text-3xl text-muted" />
          <p class="text-sm text-muted">Lo storico tornei apparirà qui quando saranno aggiunti dei tornei.</p>
        </div>
      </UCard>
    </div>

    <!-- Edit modal -->
    <UModal v-model:open="isEditOpen" title="Modifica giocatore">
      <template #body>
        <PlayerForm
          :player="player"
          @saved="onPlayerSaved"
          @cancel="isEditOpen = false"
        />
      </template>
    </UModal>
  </div>

  <div v-else-if="status === 'error'" class="text-center py-16">
    <UIcon name="i-lucide-alert-circle" class="text-4xl text-red-500 mb-3" />
    <p class="font-medium">Giocatore non trovato</p>
    <UButton to="/players" label="Torna ai giocatori" variant="soft" class="mt-4" />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import type { Player, PlayerTournamentHistoryEntry } from '~/types/domain'

const route = useRoute()
const id = route.params.id as string

const { data: player, status, refresh } = await useFetch<Player>(`/api/players/${id}`)
const { data: history } = await useFetch<PlayerTournamentHistoryEntry[]>(`/api/players/${id}/history`)

const isEditOpen = ref(false)
const headerRef = ref<HTMLElement | null>(null)
const { fadeIn } = useAnime()

onMounted(() => {
  if (headerRef.value) fadeIn(headerRef.value)
})

const historyColumns: ColumnDef<PlayerTournamentHistoryEntry>[] = [
  { accessorKey: 'tournamentName', header: 'Torneo' },
  { accessorKey: 'leagueName', header: 'Lega' },
  { accessorKey: 'tournamentDate', header: 'Data' },
  { accessorKey: 'pointsEarned', header: 'Punti' },
  { accessorKey: 'finalPlacement', header: 'Piazzamento', id: 'finalPlacement' },
  { accessorKey: 'isWinner', header: '★', id: 'isWinner' },
]

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function openEdit() {
  isEditOpen.value = true
}

async function onPlayerSaved(updated: Player) {
  isEditOpen.value = false
  await refresh()
}
</script>