<template>
  <div v-if="tournament">
    <div ref="headerRef" class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <UButton
          :to="`/leagues/${tournament.leagueId}`"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Torna alla lega"
        />
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-2xl font-bold">{{ tournament.name }}</h1>
            <UBadge :label="tournament.status" :color="statusColor(tournament.status)" variant="soft" />
            <UBadge
              v-if="tournament.entryMode === 'manual'"
              label="Manuale"
              color="amber"
              variant="soft"
              size="sm"
              icon="i-lucide-pencil-line"
            />
          </div>
          <p class="text-muted text-sm">
            <NuxtLink :to="`/leagues/${tournament.leagueId}`" class="hover:underline">
              {{ tournament.leagueName }}
            </NuxtLink>
            · {{ formatDate(tournament.date) }}
          </p>
        </div>
      </div>
    </div>

    <UTabs :items="tabs" class="w-full">
      <!-- ── Info ─────────────────────────────────────────────────────────── -->
      <template #info>
        <div class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-info" class="text-primary" />
                <span class="font-semibold">Dettagli torneo</span>
              </div>
            </template>

            <dl class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt class="text-muted mb-1">Data</dt>
                <dd class="font-medium">{{ formatDate(tournament.date) }}</dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Round</dt>
                <dd class="font-medium">{{ tournament.roundCount }}</dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Blocco</dt>
                <dd class="font-medium">Block {{ tournament.pairBlockIndex }}</dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Stato</dt>
                <dd>
                  <UBadge
                    :label="tournament.status"
                    :color="statusColor(tournament.status)"
                    variant="soft"
                    size="sm"
                  />
                </dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Modalità</dt>
                <dd>
                  <UBadge
                    :label="tournament.entryMode === 'manual' ? 'Manuale' : 'Automatica'"
                    :color="tournament.entryMode === 'manual' ? 'amber' : 'neutral'"
                    variant="soft"
                    size="sm"
                  />
                </dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Partecipanti</dt>
                <dd class="font-medium">{{ participants?.length ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-muted mb-1">Lega</dt>
                <dd>
                  <NuxtLink
                    :to="`/leagues/${tournament.leagueId}`"
                    class="hover:underline text-primary"
                  >
                    {{ tournament.leagueName }}
                  </NuxtLink>
                </dd>
              </div>
            </dl>
          </UCard>
        </div>
      </template>

      <!-- ── Participants ──────────────────────────────────────────────────── -->
      <template #participants>
        <div class="pt-4">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-muted">
              {{ participants?.length ?? 0 }}
              participant{{ (participants?.length ?? 0) === 1 ? '' : 's' }}
            </p>
            <UButton
              label="Add Participant"
              icon="i-lucide-user-plus"
              size="sm"
              :disabled="tournament.status !== 'draft'"
              @click="openAddParticipant"
            />
          </div>

          <UCard>
            <UTable
              :data="participants ?? []"
              :columns="participantColumns"
              :loading="participantsStatus === 'pending'"
              empty="Nessun partecipante. Aggiungi giocatori per iniziare."
            >
              <template #playerName-cell="{ row }">
                <NuxtLink
                  :to="`/players/${row.original.playerId}`"
                  class="font-medium hover:underline"
                >
                  {{ row.original.playerName }}
                </NuxtLink>
              </template>

              <template #triggerTypeLabel-cell="{ row }">
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    :label="row.original.triggerTypeLabel"
                    color="neutral"
                    variant="soft"
                    size="sm"
                  />
                  <UBadge
                    v-if="row.original.triggerTypeLabel2"
                    :label="row.original.triggerTypeLabel2"
                    color="neutral"
                    variant="soft"
                    size="sm"
                  />
                </div>
              </template>

              <template #pointsEarned-cell="{ row }">
                <span class="font-mono font-medium">{{ row.original.pointsEarned }}</span>
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

              <template #star-cell="{ row }">
                <UIcon
                  v-if="row.original.isWinner"
                  name="i-lucide-star"
                  class="text-yellow-500"
                  title="Tournament Winner"
                />
              </template>

              <template #actions-cell="{ row }">
                <div class="flex justify-end">
                  <UButton
                    v-if="tournament.status === 'draft'"
                    icon="i-lucide-trash-2"
                    size="xs"
                    variant="ghost"
                    color="red"
                    aria-label="Remove participant"
                    @click="handleRemoveParticipant(row.original.id)"
                  />
                </div>
              </template>
            </UTable>
          </UCard>
        </div>

        <!-- Add participant modal -->
        <UModal v-model:open="isAddParticipantOpen" title="Aggiungi partecipante">
          <template #body>
            <TournamentAddParticipantForm
              :tournament-id="id"
              :all-players="allPlayers ?? []"
              :trigger-types="triggerTypes ?? []"
              :current-participant-player-ids="currentPlayerIds"
              @saved="onParticipantSaved"
              @cancel="isAddParticipantOpen = false"
            />
          </template>
        </UModal>
      </template>

      <!-- ── Rounds ────────────────────────────────────────────────────────── -->
      <template #rounds>
        <div class="pt-4 space-y-6">

          <!-- ── MANUAL MODE ──────────────────────────────────────────────── -->
          <div v-if="tournament.entryMode === 'manual'" class="space-y-4">
            <UCard>
              <template #header>
                <span class="font-semibold">Risultati manuali</span>
              </template>
              <div class="space-y-3">
                <div v-for="p in participants ?? []" :key="p.id" class="flex items-center gap-3">
                  <span class="flex-1 font-medium text-sm">{{ p.playerName }}</span>
                  <div class="flex items-center gap-2">
                    <label class="text-xs text-muted">V</label>
                    <UInput
                      type="number"
                      :min="0"
                      :max="tournament.roundCount"
                      v-model.number="manualResults[p.id]!.wins"
                      class="w-16"
                    />
                    <label class="text-xs text-muted">P</label>
                    <UInput
                      type="number"
                      :min="0"
                      :max="tournament.roundCount"
                      v-model.number="manualResults[p.id]!.losses"
                      class="w-16"
                    />
                  </div>
                  <span class="text-xs text-muted w-12 text-right">{{ (manualResults[p.id]?.wins ?? 0) * 3 }} pts</span>
                </div>
              </div>
              <template #footer>
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Salva risultati"
                    icon="i-lucide-save"
                    :loading="isSavingManual"
                    :disabled="(participants?.length ?? 0) === 0"
                    @click="handleSaveManualResults"
                  />
                  <UButton
                    v-if="canFinalize"
                    label="Finalizza torneo"
                    icon="i-lucide-trophy"
                    color="success"
                    :loading="isFinalizing"
                    @click="handleFinalize"
                  />
                </div>
              </template>
            </UCard>

            <!-- Finalized notice -->
            <div
              v-if="tournament.status === 'finalized'"
              class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
            >
              <UIcon name="i-lucide-check-circle" />
              <span>Torneo finalizzato</span>
              <span v-if="tournament.winnerPlayerId" class="font-medium">
                · Vincitore: {{ winnerName }}
              </span>
            </div>

            <!-- Standings after finalization -->
            <UCard v-if="roundsData?.standings?.length">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-award" class="text-primary" />
                  <span class="font-semibold">Classifica finale</span>
                </div>
              </template>
              <UTable :data="roundsData.standings" :columns="standingsColumns">
                <template #placement-cell="{ row }">
                  <span class="font-mono font-medium text-muted">#{{ row.original.placement }}</span>
                </template>
                <template #playerName-cell="{ row }">
                  <div class="flex items-center gap-2">
                    <NuxtLink :to="`/players/${row.original.playerId}`" class="font-medium hover:underline">
                      {{ row.original.playerName }}
                    </NuxtLink>
                    <UIcon
                      v-if="row.original.isWinner"
                      name="i-lucide-star"
                      class="text-yellow-500"
                      title="Tournament Winner"
                    />
                  </div>
                </template>
                <template #points-cell="{ row }">
                  <span class="font-mono font-semibold">{{ row.original.points }}</span>
                </template>
                <template #record-cell="{ row }">
                  <span class="text-sm text-muted">
                    {{ row.original.wins }}W {{ row.original.losses }}L
                  </span>
                </template>
              </UTable>
            </UCard>
          </div>

          <!-- ── MANAGED MODE ─────────────────────────────────────────────── -->
          <template v-else>
            <!-- Action bar -->
            <div class="flex items-center gap-3 flex-wrap">
              <UButton
                v-if="canGenerateRound"
                :label="`Genera Round ${nextRoundNumber}`"
                icon="i-lucide-shuffle"
                :loading="isGenerating"
                @click="handleGenerateRound"
              />
              <UButton
                v-if="canFinalize"
                label="Finalizza torneo"
                icon="i-lucide-flag"
                color="green"
                :loading="isFinalizing"
                @click="handleFinalize"
              />
              <div
                v-if="tournament.status === 'finalized'"
                class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
              >
                <UIcon name="i-lucide-check-circle" />
                <span>Torneo finalizzato</span>
                <span v-if="tournament.winnerPlayerId" class="font-medium">
                  · Vincitore: {{ winnerName }}
                </span>
              </div>
              <p
                v-if="tournament.status === 'draft' && !canGenerateRound"
                class="text-sm text-muted"
              >
                Aggiungi almeno 2 partecipanti per generare i pairing.
              </p>
            </div>

            <!-- Round cards -->
            <div
              v-if="roundsData && roundsData.rounds.length > 0"
              class="space-y-4"
            >
              <UCard
                v-for="round in roundsData.rounds"
                :key="round.roundNumber"
              >
                <template #header>
                  <div class="flex items-center justify-between">
                    <span class="font-semibold">Round {{ round.roundNumber }}</span>
                    <UBadge
                      :label="round.isComplete ? 'Completato' : 'In corso'"
                      :color="round.isComplete ? 'green' : 'amber'"
                      variant="soft"
                      size="sm"
                    />
                  </div>
                </template>

                <div class="divide-y divide-default">
                  <div
                    v-for="match in round.matches"
                    :key="match.id"
                    class="py-3 first:pt-0 last:pb-0"
                  >
                    <!-- Bye match -->
                    <div v-if="match.isBye" class="flex items-center justify-between">
                      <span class="font-medium">{{ match.player1Name }}</span>
                      <div class="flex items-center gap-2">
                        <UBadge label="BYE" color="amber" variant="soft" size="sm" />
                        <UIcon name="i-lucide-trophy" class="text-yellow-500 text-xs" />
                      </div>
                    </div>

                    <!-- Regular match -->
                    <div v-else class="flex items-center gap-2">
                      <button
                        :disabled="tournament.status === 'finalized' || isSettingResult"
                        :class="matchPlayerClass(match, 'player1')"
                        @click="match.winnerPlayerId !== match.player1Id && handleSetResult(match.id, match.player1Id!)"
                      >
                        <span>{{ match.player1Name }}</span>
                        <UIcon
                          v-if="match.winnerPlayerId === match.player1Id"
                          name="i-lucide-trophy"
                          class="shrink-0 text-yellow-500"
                        />
                      </button>

                      <span class="text-muted text-xs shrink-0 font-medium">vs</span>

                      <button
                        :disabled="tournament.status === 'finalized' || isSettingResult"
                        :class="matchPlayerClass(match, 'player2')"
                        @click="match.winnerPlayerId !== match.player2Id && handleSetResult(match.id, match.player2Id!)"
                      >
                        <span>{{ match.player2Name }}</span>
                        <UIcon
                          v-if="match.winnerPlayerId === match.player2Id"
                          name="i-lucide-trophy"
                          class="shrink-0 text-yellow-500"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Empty state when no rounds yet -->
            <UCard v-else-if="tournament.status === 'draft'">
              <div class="flex flex-col items-center py-10 gap-2 text-center">
                <UIcon name="i-lucide-calendar-clock" class="text-3xl text-muted" />
                <p class="font-medium">No rounds yet</p>
                <p class="text-sm text-muted">Add participants and generate the first round.</p>
              </div>
            </UCard>

            <!-- Live standings (always visible once there are participants) -->
            <UCard v-if="roundsData && roundsData.standings.length > 0">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="tournament.status === 'finalized' ? 'i-lucide-award' : 'i-lucide-list-ordered'"
                    class="text-primary"
                  />
                  <span class="font-semibold">
                    {{ tournament.status === 'finalized' ? 'Classifica finale' : 'Classifica provvisoria' }}
                  </span>
                </div>
              </template>

              <UTable
                :data="roundsData.standings"
                :columns="standingsColumns"
              >
                <template #placement-cell="{ row }">
                  <span class="font-mono font-medium text-muted">#{{ row.original.placement }}</span>
                </template>
                <template #playerName-cell="{ row }">
                  <div class="flex items-center gap-2">
                    <NuxtLink :to="`/players/${row.original.playerId}`" class="font-medium hover:underline">
                      {{ row.original.playerName }}
                    </NuxtLink>
                    <UIcon
                      v-if="row.original.isWinner"
                      name="i-lucide-star"
                      class="text-yellow-500"
                      title="Tournament Winner"
                    />
                  </div>
                </template>
                <template #points-cell="{ row }">
                  <span class="font-mono font-semibold">{{ row.original.points }}</span>
                </template>
                <template #record-cell="{ row }">
                  <span class="text-sm text-muted">
                    {{ row.original.wins }}W
                    {{ row.original.losses }}L
                    <template v-if="row.original.byes > 0">{{ row.original.byes }}B</template>
                  </span>
                </template>
              </UTable>
            </UCard>
          </template>
        </div>
      </template>
    </UTabs>
  </div>

  <div v-else-if="tournamentStatus === 'error'" class="text-center py-16">
    <UIcon name="i-lucide-alert-circle" class="text-4xl text-red-500 mb-3" />
    <p class="font-medium">Torneo non trovato</p>
    <UButton to="/leagues" label="Torna alle leghe" variant="soft" class="mt-4" />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import type {
  TournamentWithLeague,
  ParticipantDetail,
  Player,
  ClimaxTriggerType,
  RoundsAndStandings,
  TournamentStanding,
  MatchDetail,
} from '~/types/domain'

const DEFAULT_ROUND_COUNT = 3

const route = useRoute()
const id = route.params.id as string

const {
  data: tournament,
  status: tournamentStatus,
  refresh: refreshTournament,
} = await useFetch<TournamentWithLeague>(`/api/tournaments/${id}`)

const {
  data: participants,
  status: participantsStatus,
  refresh: refreshParticipants,
} = await useFetch<ParticipantDetail[]>(`/api/tournaments/${id}/participants`)

const { data: allPlayers } = await useFetch<Player[]>('/api/players')
const { data: triggerTypes } = await useFetch<ClimaxTriggerType[]>('/api/climax-trigger-types')

const {
  data: roundsData,
  refresh: refreshRounds,
} = await useFetch<RoundsAndStandings>(`/api/tournaments/${id}/rounds`)

const isAddParticipantOpen = ref(false)
const isGenerating = ref(false)
const isSettingResult = ref(false)
const isFinalizing = ref(false)
const isSavingManual = ref(false)
const manualResults = ref<Record<string, { wins: number; losses: number }>>({})
const headerRef = ref<HTMLElement | null>(null)
const { fadeIn } = useAnime()
const { removeParticipant, generateRound, setMatchResult, finalizeTournament, setManualResults } = useTournament()

onMounted(() => {
  if (headerRef.value) fadeIn(headerRef.value)
})

// Initialize manualResults when participants load
watch(() => participants.value, (parts) => {
  if (!parts) return
  for (const p of parts) {
    if (!manualResults.value[p.id]) {
      manualResults.value[p.id] = { wins: 0, losses: 0 }
    }
  }
}, { immediate: true })

const tabs = [
  { label: 'Info', slot: 'info', icon: 'i-lucide-info' },
  { label: 'Partecipanti', slot: 'participants', icon: 'i-lucide-users' },
  { label: 'Round', slot: 'rounds', icon: 'i-lucide-layers' },
]

// ─── Participant tab ──────────────────────────────────────────────────────────

const participantColumns = computed((): ColumnDef<ParticipantDetail>[] => {
  const cols: ColumnDef<ParticipantDetail>[] = [
    { accessorKey: 'playerName', header: 'Giocatore' },
    { accessorKey: 'triggerTypeLabel', header: 'Trigger' },
    { accessorKey: 'pointsEarned', header: 'Punti' },
  ]
  if (tournament.value?.status === 'finalized') {
    cols.push({ accessorKey: 'finalPlacement', header: 'Piazzamento' })
    cols.push({ id: 'star', header: '' })
  }
  if (tournament.value?.status === 'draft') {
    cols.push({ id: 'actions', header: '' })
  }
  return cols
})

const currentPlayerIds = computed(() =>
  (participants.value ?? []).map(p => p.playerId),
)

const winnerName = computed(() => {
  if (!tournament.value?.winnerPlayerId) return null
  return (participants.value ?? []).find(p => p.playerId === tournament.value!.winnerPlayerId)?.playerName ?? null
})

function openAddParticipant() {
  isAddParticipantOpen.value = true
}

async function onParticipantSaved() {
  isAddParticipantOpen.value = false
  await refreshParticipants()
}

async function handleRemoveParticipant(participationId: string) {
  await removeParticipant(id, participationId)
  await refreshParticipants()
}

// ─── Rounds tab ───────────────────────────────────────────────────────────────

const standingsColumns: ColumnDef<TournamentStanding>[] = [
  { accessorKey: 'placement', header: '#' },
  { accessorKey: 'playerName', header: 'Giocatore' },
  { accessorKey: 'points', header: 'Punti' },
  { id: 'record', header: 'Risultato' },
]

const nextRoundNumber = computed(() => (roundsData.value?.rounds.length ?? 0) + 1)

const canGenerateRound = computed(() => {
  if (!tournament.value || tournament.value.status === 'finalized') return false
  if (tournament.value.entryMode === 'manual') return false
  if ((participants.value?.length ?? 0) < 2) return false
  const rounds = roundsData.value?.rounds ?? []
  if (rounds.length >= (tournament.value.roundCount ?? DEFAULT_ROUND_COUNT)) return false
  if (rounds.length === 0) return true
  return rounds[rounds.length - 1]?.isComplete ?? false
})

const canFinalize = computed(() => {
  if (!tournament.value || tournament.value.status !== 'active') return false
  if (tournament.value.entryMode === 'manual') return true
  const rounds = roundsData.value?.rounds ?? []
  if (rounds.length < (tournament.value.roundCount ?? DEFAULT_ROUND_COUNT)) return false
  return rounds.every(r => r.isComplete)
})

function matchPlayerClass(match: MatchDetail, side: 'player1' | 'player2'): string {
  const playerId = side === 'player1' ? match.player1Id : match.player2Id
  const isWinner = match.winnerPlayerId === playerId
  const isLoser = match.winnerPlayerId !== null && !isWinner

  const base = 'flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors'
  if (isWinner) return `${base} bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300`
  if (isLoser) return `${base} opacity-40 border-transparent`
  if (tournament.value?.status === 'finalized') return `${base} border-default cursor-default`
  return `${base} border-default hover:bg-muted/50 cursor-pointer`
}

async function handleGenerateRound() {
  isGenerating.value = true
  try {
    await generateRound(id)
    await Promise.all([refreshTournament(), refreshRounds(), refreshParticipants()])
  }
  finally {
    isGenerating.value = false
  }
}

async function handleSetResult(matchId: string, winnerId: string) {
  isSettingResult.value = true
  try {
    await setMatchResult(id, matchId, winnerId)
    await Promise.all([refreshRounds(), refreshParticipants()])
  }
  finally {
    isSettingResult.value = false
  }
}

async function handleFinalize() {
  isFinalizing.value = true
  try {
    await finalizeTournament(id)
    await Promise.all([refreshTournament(), refreshRounds(), refreshParticipants()])
  }
  finally {
    isFinalizing.value = false
  }
}

async function handleSaveManualResults() {
  isSavingManual.value = true
  try {
    const results = (participants.value ?? []).map(p => ({
      participationId: p.id,
      wins: manualResults.value[p.id]?.wins ?? 0,
      losses: manualResults.value[p.id]?.losses ?? 0,
    }))
    await setManualResults(id, results)
    await Promise.all([refreshParticipants(), refreshRounds(), refreshTournament()])
  }
  catch (e: unknown) {
    console.error(e)
  }
  finally {
    isSavingManual.value = false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function statusColor(status: string) {
  return status === 'finalized' ? 'green' : status === 'active' ? 'blue' : 'neutral'
}
</script>