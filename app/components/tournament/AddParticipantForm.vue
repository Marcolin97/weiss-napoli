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

      <UFormField label="Tipo Trigger 1" name="climaxTriggerTypeId" required>
        <USelect
          v-model="state.climaxTriggerTypeId"
          :items="triggerTypeOptions"
          value-key="value"
          label-key="label"
          placeholder="Seleziona un trigger"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Tipo Trigger 2" name="climaxTriggerTypeId2" required>
        <USelect
          v-model="state.climaxTriggerTypeId2"
          :items="triggerTypeOptions"
          value-key="value"
          label-key="label"
          placeholder="Seleziona un trigger"
          class="w-full"
        />
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
import type { Player, ClimaxTriggerType, ParticipantDetail } from '~/types/domain'

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
})

const isPending = ref(false)
const serverError = ref('')

const availablePlayers = computed(() =>
  props.allPlayers
    .filter(p => !props.currentParticipantPlayerIds.includes(p.id))
    .map(p => ({ label: p.name, value: p.id })),
)

const triggerTypeOptions = computed(() =>
  props.triggerTypes.map(t => ({ label: t.label, value: t.id })),
)

async function onSubmit() {
  if (!state.playerId || !state.climaxTriggerTypeId || !state.climaxTriggerTypeId2) return
  isPending.value = true
  serverError.value = ''
  try {
    const result = await addParticipant(props.tournamentId, {
      playerId: state.playerId,
      climaxTriggerTypeId: state.climaxTriggerTypeId,
      climaxTriggerTypeId2: state.climaxTriggerTypeId2,
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
