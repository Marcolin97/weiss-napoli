<template>
  <UForm :state="state" :validate="validate" @submit="onSubmit" @error="onError">
    <div class="space-y-4">
      <UFormField label="Giocatore" name="playerId" required>
        <USelect v-model="state.playerId" :items="availablePlayers" value-key="value" label-key="label"
          placeholder="Seleziona un giocatore" class="w-full" />
      </UFormField>

      <UFormField label="Tipo Trigger 1" name="climaxTriggerTypeId" required>
        <div class="space-y-1">
          <USelect v-model="state.climaxTriggerTypeId" :items="triggerTypeOptions" value-key="value" label-key="label"
            placeholder="Seleziona un trigger" class="w-full" />

          <div v-if="selectedTrigger1?.imageUrl" class="mt-1 flex items-center gap-2">
            <img :src="selectedTrigger1.imageUrl" :alt="selectedTrigger1.label"
              class="h-8 w-8 rounded border border-default bg-muted/20 object-contain">
            <span class="text-xs text-muted">{{ selectedTrigger1.label }}</span>
          </div>
        </div>
      </UFormField>

      <UFormField label="Tipo Trigger 2" name="climaxTriggerTypeId2" required>
        <div class="space-y-1">
          <USelect v-model="state.climaxTriggerTypeId2" :items="triggerTypeOptions" value-key="value" label-key="label"
            placeholder="Seleziona un trigger" class="w-full" />

          <div v-if="selectedTrigger2?.imageUrl" class="mt-1 flex items-center gap-2">
            <img :src="selectedTrigger2.imageUrl" :alt="selectedTrigger2.label"
              class="h-8 w-8 rounded border border-default bg-muted/20 object-contain">
            <span class="text-xs text-muted">{{ selectedTrigger2.label }}</span>
          </div>
        </div>
      </UFormField>

      <UFormField label="Deck / Set" name="deckId">
        <template #help>
          <span v-if="decksStatus === 'pending'" class="text-xs text-muted">
            Caricamento deck in corso…
          </span>

          <span v-else-if="decksError" class="text-xs text-warning">
            Impossibile caricare i deck. Puoi comunque salvare senza deck.
          </span>

          <span v-else class="text-xs text-muted">
            Sorgente: EncoreDecks. Opzionale.
          </span>
        </template>

        <USelectMenu v-model="state.deckId" :items="deckOptions" value-key="value" label-key="label"
          placeholder="Nessun deck selezionato" :search-input="{ placeholder: 'Cerca per nome...' }"
          :disabled="decksStatus === 'pending'" :portal="false" class="w-full" />
      </UFormField>

      <UAlert v-if="availablePlayers.length === 0" color="warning" icon="i-lucide-alert-triangle"
        description="Tutti i giocatori esistenti sono già registrati. Crea prima nuovi giocatori." variant="soft" />

      <UAlert v-if="serverError" color="error" icon="i-lucide-alert-circle" :description="serverError" />

      <div class="flex justify-end gap-2 pt-2">
        <UButton type="button" label="Annulla" variant="ghost" color="neutral" @click="$emit('cancel')" />

        <UButton type="submit" label="Aggiungi partecipante" :loading="isPending"
          :disabled="availablePlayers.length === 0 || isPending" />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type {
  Player,
  ClimaxTriggerType,
  ParticipantDetail,
  EncoreDeckSet,
} from '~~/types/domain'

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

const state = reactive<{
  playerId: string | null
  climaxTriggerTypeId: string | null
  climaxTriggerTypeId2: string | null
  deckId: string | null
}>({
  playerId: null,
  climaxTriggerTypeId: null,
  climaxTriggerTypeId2: null,
  deckId: null,
})

const isPending = ref(false)
const serverError = ref('')

const {
  data: decks,
  status: decksStatus,
  error: decksError,
} = useFetch<EncoreDeckSet[]>('/api/encoredecks/sets', {
  default: () => [],
})

const availablePlayers = computed(() =>
  props.allPlayers
    .filter(player => !props.currentParticipantPlayerIds.includes(player.id))
    .map(player => ({
      label: player.name,
      value: player.id,
    })),
)

const triggerTypeOptions = computed(() =>
  props.triggerTypes.map(trigger => ({
    label: trigger.label,
    value: trigger.id,
  })),
)

const deckOptions = computed(() =>
  (decks.value ?? []).map(deck => ({
    label: deck.name,
    value: deck._id,
  })),
)

const selectedTrigger1 = computed(() =>
  props.triggerTypes.find(trigger => trigger.id === state.climaxTriggerTypeId) ?? null,
)

const selectedTrigger2 = computed(() =>
  props.triggerTypes.find(trigger => trigger.id === state.climaxTriggerTypeId2) ?? null,
)

function validate(formState: typeof state): FormError[] {
  const errors: FormError[] = []

  if (!formState.playerId) {
    errors.push({
      name: 'playerId',
      message: 'Seleziona un giocatore',
    })
  }

  if (!formState.climaxTriggerTypeId) {
    errors.push({
      name: 'climaxTriggerTypeId',
      message: 'Seleziona il tipo trigger 1',
    })
  }

  if (!formState.climaxTriggerTypeId2) {
    errors.push({
      name: 'climaxTriggerTypeId2',
      message: 'Seleziona il tipo trigger 2',
    })
  }

  return errors
}

function resetForm() {
  state.playerId = null
  state.climaxTriggerTypeId = null
  state.climaxTriggerTypeId2 = null
  state.deckId = null
}

function onError() {
  serverError.value = ''
}

async function onSubmit() {
  isPending.value = true
  serverError.value = ''

  try {
    const selectedDeck = (decks.value ?? []).find(deck => deck._id === state.deckId) ?? null

    const result = await addParticipant(props.tournamentId, {
      playerId: state.playerId!,
      climaxTriggerTypeId: state.climaxTriggerTypeId!,
      climaxTriggerTypeId2: state.climaxTriggerTypeId2!,
      deckId: selectedDeck?._id ?? null,
      deckName: selectedDeck?.name ?? null,
    })

    resetForm()
    emit('saved', result)
  }
  catch (error: unknown) {
    serverError.value =
      (error as { data?: { message?: string } })?.data?.message ??
      'Si è verificato un errore durante il salvataggio'
  }
  finally {
    isPending.value = false
  }
}
</script>