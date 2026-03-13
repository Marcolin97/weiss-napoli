<template>
  <div v-if="league">
    <div ref="headerRef" class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <UButton
          to="/leagues"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Torna alle leghe"
        />
        <div>
          <h1 class="text-2xl font-bold">{{ league.name }}</h1>
          <p class="text-muted text-sm">Created {{ formatDate(league.createdAt) }}</p>
        </div>
      </div>
      <UButton label="Modifica" icon="i-lucide-pencil" variant="soft" @click="openEdit" />
    </div>

    <UTabs :items="tabs" class="w-full">
      <template #overview>
        <div class="space-y-4 pt-4">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-info" class="text-primary" />
                <span class="font-semibold">Overview</span>
              </div>
            </template>

            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-muted mb-1">Nome</dt>
                <dd class="font-medium">{{ league.name }}</dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Creata</dt>
                <dd class="font-medium">{{ formatDate(league.createdAt) }}</dd>
              </div>
              <div v-if="league.description" class="sm:col-span-2">
                <dt class="text-muted mb-1">Descrizione</dt>
                <dd>{{ league.description }}</dd>
              </div>
            </dl>
          </UCard>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <UCard v-for="stat in stats" :key="stat.label">
              <div class="text-center">
                <p class="text-2xl font-bold text-primary">{{ stat.value }}</p>
                <p class="text-sm text-muted">{{ stat.label }}</p>
              </div>
            </UCard>
          </div>
        </div>
      </template>

      <template #tournaments>
        <div class="pt-4">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-muted">
              {{ tournaments?.length ?? 0 }} tournament{{ (tournaments?.length ?? 0) === 1 ? '' : 's' }}
            </p>
            <UButton
              label="Nuovo torneo"
              icon="i-lucide-plus"
              size="sm"
              @click="openCreateTournament"
            />
          </div>

          <UCard v-if="!tournaments?.length">
            <div class="flex flex-col items-center justify-center py-10 text-center gap-2">
              <UIcon name="i-lucide-calendar" class="text-3xl text-muted" />
              <p class="text-sm text-muted">Nessun torneo ancora. Crea il primo.</p>
            </div>
          </UCard>

          <div v-else class="space-y-3">
            <UCard
              v-for="t in tournaments"
              :key="t.id"
              class="hover:ring-1 hover:ring-primary transition-all"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UIcon name="i-lucide-calendar" class="text-muted shrink-0" />
                  <div>
                    <NuxtLink
                      :to="`/tournaments/${t.id}`"
                      class="font-medium hover:underline"
                    >
                      {{ t.name }}
                    </NuxtLink>
                    <p class="text-xs text-muted">
                      {{ formatDate(t.date) }} · {{ t.roundCount }} rounds · Blocco {{ t.pairBlockIndex }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge :label="t.status" :color="statusColor(t.status)" variant="soft" size="sm" />
                  <UButton
                    :to="`/tournaments/${t.id}`"
                    icon="i-lucide-arrow-right"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                  />
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Create tournament modal -->
        <UModal v-model:open="isCreateTournamentOpen" title="Nuovo torneo">
          <template #body>
            <TournamentForm
              :league-id="id"
              :current-tournament-count="tournaments?.length ?? 0"
              @saved="onTournamentSaved"
              @cancel="isCreateTournamentOpen = false"
            />
          </template>
        </UModal>
      </template>

      <template #standings>
        <div class="pt-4 space-y-6">
          <!-- Empty state -->
          <UCard v-if="!standings?.standings.length">
            <div class="flex flex-col items-center justify-center py-12 text-center gap-3">
              <UIcon name="i-lucide-table-2" class="text-3xl text-muted" />
              <p class="font-medium">Nessuna classifica ancora</p>
              <p class="text-sm text-muted">
                La classifica appare quando i giocatori partecipano ai tornei della lega.
              </p>
            </div>
          </UCard>

          <template v-else>
            <!-- Summary standings table -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-award" class="text-primary" />
                  <span class="font-semibold">Classifica lega</span>
                  <UBadge
                    :label="`${standings!.pairBlockCount} ${standings!.pairBlockCount === 1 ? 'blocco' : 'blocchi'}`"
                    color="neutral"
                    variant="soft"
                    size="sm"
                  />
                </div>
              </template>

              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-default">
                      <th class="text-left py-2 pr-4 font-medium text-muted w-8">#</th>
                      <th class="text-left py-2 pr-4 font-medium text-muted">Giocatore</th>
                      <th
                        v-for="blockIndex in standings!.allPairBlockIndices"
                        :key="blockIndex"
                        class="text-center py-2 px-3 font-medium text-muted whitespace-nowrap"
                      >
                        Blocco {{ blockIndex }}
                      </th>
                      <th class="text-right py-2 pl-4 font-medium text-muted whitespace-nowrap">Totale</th>
                      <th class="text-center py-2 pl-4 font-medium text-muted">★</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in standings!.standings"
                      :key="row.playerId"
                      class="border-b border-default last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td class="py-3 pr-4">
                        <span class="font-mono text-muted text-xs">#{{ row.rank }}</span>
                      </td>
                      <td class="py-3 pr-4">
                        <NuxtLink
                          :to="`/players/${row.playerId}`"
                          class="font-medium hover:underline"
                        >
                          {{ row.playerName }}
                        </NuxtLink>
                      </td>
                      <td
                        v-for="block in row.pairBlocks"
                        :key="block.pairBlockIndex"
                        class="py-3 px-3 text-center"
                      >
                        <div class="flex flex-col items-center gap-1">
                          <span
                            :class="[
                              'font-mono font-semibold',
                              block.selectedPoints > 0 ? 'text-primary' : 'text-muted',
                            ]"
                          >
                            {{ block.selectedPoints }}
                          </span>
                          <div class="flex gap-1">
                            <span
                              v-for="tr in block.tournaments"
                              :key="tr.tournamentId"
                              :title="`${tr.tournamentName}: ${tr.wasAbsent ? 'Assente' : tr.points + 'pts'}${tr.isSelected ? ' ✓ selezionato' : ''}`"
                              :class="[
                                'w-2 h-2 rounded-full',
                                tr.wasAbsent
                                  ? 'bg-muted/40'
                                  : tr.isSelected
                                    ? 'bg-primary'
                                    : 'bg-muted/60',
                              ]"
                            />
                          </div>
                        </div>
                      </td>
                      <td class="py-3 pl-4 text-right">
                        <span class="font-mono font-bold text-base">{{ row.totalPoints }}</span>
                      </td>
                      <td class="py-3 pl-4 text-center">
                        <div class="flex items-center justify-center gap-0.5">
                          <UIcon
                            v-for="i in row.winnerStars"
                            :key="i"
                            name="i-lucide-star"
                            class="text-yellow-500 text-xs"
                          />
                          <span v-if="row.winnerStars === 0" class="text-muted text-xs">—</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <!-- Dettaglio blocchi -->
            <div class="space-y-4">
              <h3 class="font-semibold text-sm text-muted uppercase tracking-wide">
                Dettaglio blocchi
              </h3>

              <UCard
                v-for="blockIndex in standings!.allPairBlockIndices"
                :key="blockIndex"
              >
                <template #header>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-layers" class="text-muted" />
                    <span class="font-semibold">Blocco {{ blockIndex }}</span>
                    <div class="flex gap-2">
                      <UBadge
                        v-for="t in getTournamentsForBlock(blockIndex)"
                        :key="t.tournamentId"
                        :label="t.tournamentName"
                        color="neutral"
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </div>
                </template>

                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-default">
                        <th class="text-left py-2 pr-4 font-medium text-muted">Giocatore</th>
                        <th
                          v-for="t in getTournamentsForBlock(blockIndex)"
                          :key="t.tournamentId"
                          class="text-center py-2 px-3 font-medium text-muted"
                        >
                          <NuxtLink
                            :to="`/tournaments/${t.tournamentId}`"
                            class="hover:underline"
                          >
                            {{ t.tournamentName }}
                          </NuxtLink>
                        </th>
                        <th class="text-right py-2 pl-4 font-medium text-muted">Punti</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in standings!.standings"
                        :key="row.playerId"
                        class="border-b border-default last:border-0"
                      >
                        <td class="py-2 pr-4">
                          <NuxtLink :to="`/players/${row.playerId}`" class="font-medium hover:underline">
                            {{ row.playerName }}
                          </NuxtLink>
                        </td>
                        <td
                          v-for="tr in getPlayerBlockResults(row, blockIndex)"
                          :key="tr.tournamentId"
                          class="py-2 px-3 text-center"
                        >
                          <div
                            v-if="tr.wasAbsent"
                            class="flex items-center justify-center gap-1 text-muted"
                          >
                            <UIcon name="i-lucide-minus" class="text-xs" />
                            <span class="text-xs">Assente</span>
                          </div>
                          <div
                            v-else
                            :class="[
                              'inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded',
                              tr.isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : '',
                            ]"
                          >
                            <span :class="['font-mono font-semibold', tr.isSelected ? 'text-primary' : '']">
                              {{ tr.points }}
                            </span>
                            <div class="flex items-center gap-1 text-xs text-muted">
                              <span v-if="tr.finalPlacement">#{{ tr.finalPlacement }}</span>
                              <UIcon
                                v-if="tr.isWinner"
                                name="i-lucide-star"
                                class="text-yellow-500 text-xs"
                              />
                              <UBadge
                                v-if="tr.isSelected"
                                label="selezionato"
                                color="primary"
                                variant="soft"
                                size="xs"
                              />
                            </div>
                          </div>
                        </td>
                        <td class="py-2 pl-4 text-right">
                          <span class="font-mono font-semibold">
                            {{ getPlayerBlockPts(row, blockIndex) }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </UCard>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap gap-4 text-xs text-muted">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-primary inline-block" />
                Selezionato (conta per il totale lega)
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-muted/60 inline-block" />
                Non selezionato
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-muted/40 inline-block" />
                Assente
              </div>
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-star" class="text-yellow-500" />
                Stella vincitore (indipendente)
              </div>
            </div>
          </template>
        </div>
      </template>
    </UTabs>

    <!-- Edit modal -->
    <UModal v-model:open="isEditOpen" title="Modifica lega">
      <template #body>
        <LeagueForm
          :league="league"
          @saved="onLeagueSaved"
          @cancel="isEditOpen = false"
        />
      </template>
    </UModal>
  </div>

  <div v-else-if="status === 'error'" class="text-center py-16">
    <UIcon name="i-lucide-alert-circle" class="text-4xl text-red-500 mb-3" />
    <p class="font-medium">Lega non trovata</p>
    <UButton to="/leagues" label="Torna alle leghe" variant="soft" class="mt-4" />
  </div>
</template>

<script setup lang="ts">
import type { League, Tournament, LeagueStandingsResponse, LeagueStandingRow, LeaguePairBlockResult } from '~/types/domain'

const route = useRoute()
const id = route.params.id as string

const { data: league, status, refresh } = await useFetch<League>(`/api/leagues/${id}`)
const { data: tournaments, refresh: refreshTournaments } = await useFetch<Tournament[]>(`/api/leagues/${id}/tournaments`)
const { data: standings, refresh: refreshStandings } = await useFetch<LeagueStandingsResponse>(`/api/leagues/${id}/standings`)

const isEditOpen = ref(false)
const isCreateTournamentOpen = ref(false)
const headerRef = ref<HTMLElement | null>(null)
const { fadeIn } = useAnime()

onMounted(() => {
  if (headerRef.value) fadeIn(headerRef.value)
})

const tabs = [
  { label: 'Panoramica', slot: 'overview', icon: 'i-lucide-info' },
  { label: 'Tornei', slot: 'tournaments', icon: 'i-lucide-calendar' },
  { label: 'Classifica', slot: 'standings', icon: 'i-lucide-table-2' },
]

const stats = computed(() => {
  const tournamentCount = tournaments.value?.length ?? 0
  const blockCount = tournamentCount > 0 ? Math.ceil(tournamentCount / 2) : 0
  const uniquePlayers = standings.value?.standings.length ?? 0
  return [
    { label: 'Tornei', value: tournamentCount },
    { label: 'Blocchi', value: blockCount },
    { label: 'Giocatori', value: uniquePlayers },
  ]
})

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function statusColor(status: string) {
  return status === 'finalized' ? 'green' : status === 'active' ? 'blue' : 'neutral'
}

function openEdit() {
  isEditOpen.value = true
}

function openCreateTournament() {
  isCreateTournamentOpen.value = true
}

async function onLeagueSaved() {
  isEditOpen.value = false
  await refresh()
}

async function onTournamentSaved() {
  isCreateTournamentOpen.value = false
  await Promise.all([refreshTournaments(), refreshStandings()])
}

// ─── Standings helpers ────────────────────────────────────────────────────────

function getTournamentsForBlock(blockIndex: number) {
  const blockRow = standings.value?.standings[0]?.pairBlocks.find(
    b => b.pairBlockIndex === blockIndex,
  )
  return blockRow?.tournaments ?? []
}

function getPlayerBlockResults(row: LeagueStandingRow, blockIndex: number) {
  return row.pairBlocks.find(b => b.pairBlockIndex === blockIndex)?.tournaments ?? []
}

function getPlayerBlockPts(row: LeagueStandingRow, blockIndex: number): number {
  return row.pairBlocks.find(b => b.pairBlockIndex === blockIndex)?.selectedPoints ?? 0
}
</script>
