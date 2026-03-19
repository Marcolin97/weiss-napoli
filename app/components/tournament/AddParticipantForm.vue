<template>
  <UForm :state="state" @submit="onSubmit">
    <div class="space-y-4">
      <UFormField label="Giocatore" name="playerId" required>
        <USelect
          v-model="state.playerId"
          :items="availablePlayers"
          value-key="value"
          label-key="label"
          placeholder="Seleziona un giocatore"
          class="w-full"
        />
      </UFormField>

      <!-- Trigger 1 -->
      <UFormField label="Tipo Trigger 1" name="climaxTriggerTypeId" required>
        <div class="space-y-1">
          <USelect
            v-model="state.climaxTriggerTypeId"
            :items="triggerTypeOptions"
            value-key="value"
            label-key="label"
            placeholder="Seleziona un trigger"
            class="w-full"
          />
          <!-- Image preview -->
          <div v-if="selectedTrigger1?.imageUrl" class="flex items-center gap-2 mt-1">
            <img
              :src="selectedTrigger1.imageUrl"
              :alt="selectedTrigger1.label"
              class="w-8 h-8 object-contain rounded border border-default bg-muted/20"
            />
            <span class="text-xs text-muted">{{ selectedTrigger1.label }}</span>
          </div>
        </div>
      </UFormField>

      <!-- Trigger 2 -->
      <UFormField label="Tipo Trigger 2" name="climaxTriggerTypeId2" required>
        <div class="space-y-1">
          <USelect
            v-model="state.climaxTriggerTypeId2"
            :items="triggerTypeOptions"
            value-key="value"
            label-key="label"
            placeholder="Seleziona un trigger"
            class="w-full"
          />
          <!-- Image preview -->
          <div v-if="selectedTrigger2?.imageUrl" class="flex items-center gap-2 mt-1">
            <img
              :src="selectedTrigger2.imageUrl"
              :alt="selectedTrigger2.label"
              class="w-8 h-8 object-contain rounded border border-default bg-muted/20"
            />
            <span class="text-xs text-muted">{{ selectedTrigger2.label }}</span>
          </div>
        </div>
      </UFormField>

      <!-- Deck selection from EncoreDecks -->
      <UFormField label="Deck / Set" name="deckId">
        <USelect
          v-model="state.deckId"
          :items="deckOptions"
          value-key="value"
          label-key="label"
          placeholder="Cerca deck (opzionale)"
          class="w-full"
          :loading="decksStatus === 'pending'"
          searchable
          search-placeholder="Cerca per nome..."
        />
        <template #help>
          <span class="text-xs text-muted">Sorgente: EncoreDecks. Opzionale.</span>
        </template>
      </UFormField>

      <UAlert
        v-if="availablePlayers.length === 0"
        color="orange"
        icon="i-lucide-alert-triangle"
        description="Tutti i giocatori esistenti sono già registrati. Crea prima nuovi giocatori."
        variant="soft"
      />

      <UAlert
        v-if="serverError"
        color="red"
        icon="i-lucide-alert-circle"
        :description="serverError"
      />

      <div class="flex justify-end gap-2 pt-2">
        <UButton
          type="button"
          label="Annulla"
          variant="ghost"
          color="neutral"
          @click="$emit('cancel')"
        />
        <UButton
          type="submit"
          label="Aggiungi partecipante"
          :loading="isPending"
          :disabled="availablePlayers.length === 0"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { Player, ClimaxTriggerType, ParticipantDetail, EncoreDeckSet } from '~/types/domain'

const props = defineProps<{
  tournamentId: string
  allPlayers: Player[]
  triggerTypes: ClimaxTriggerType[]
  currentParticipantPlayerIds: string[]
}>()

const emit = defineEmits<{
  saved: [participant: ParticipantDetail]
  cancel: []
}>()

const { addParticipant } = useTournament()

const state = reactive({
  playerId: '',
  climaxTriggerTypeId: '',
  climaxTriggerTypeId2: '',
  deckId: '',
})

const isPending = ref(false)
const serverError = ref('')

const { data: decks, status: decksStatus } = useFetch<EncoreDeckSet[]>('/api/encoredecks/sets')

const availablePlayers = computed(() =>
  props.allPlayers
    .filter(p => !props.currentParticipantPlayerIds.includes(p.id))
    .map(p => ({ label: p.name, value: p.id })),
)

const triggerTypeOptions = computed(() =>
  props.triggerTypes.map(t => ({ label: t.label, value: t.id })),
)

const deckOptions = computed(() => {
  const base = [{ label: '— Nessun deck —', value: '' }]
  if (!decks.value) return base
  return [...base, ...decks.value.map(d => ({ label: d.name, value: d._id }))]
})

const selectedTrigger1 = computed(() =>
  props.triggerTypes.find(t => t.id === state.climaxTriggerTypeId) ?? null,
)

const selectedTrigger2 = computed(() =>
  props.triggerTypes.find(t => t.id === state.climaxTriggerTypeId2) ?? null,
)

async function onSubmit() {
  if (!state.playerId || !state.climaxTriggerTypeId || !state.climaxTriggerTypeId2) return
  isPending.value = true
  serverError.value = ''
  try {
    const selectedDeck = decks.value?.find(d => d._id === state.deckId) ?? null
    const result = await addParticipant(props.tournamentId, {
      playerId: state.playerId,
      climaxTriggerTypeId: state.climaxTriggerTypeId,
      climaxTriggerTypeId2: state.climaxTriggerTypeId2,
      deckId: selectedDeck?._id ?? null,
      deckName: selectedDeck?.name ?? null,
    })
    emit('saved', result)
  }
  catch (e: unknown) {
    serverError.value = (e as { data?: { message?: string } })?.data?.message ?? 'Something went wrong'
  }
  finally {
    isPending.value = false
  }
}
</script>
