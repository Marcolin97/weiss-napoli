<template>
  <UForm :state="state" @submit="onSubmit">
    <div class="space-y-4">
      <UFormField label="Nome" name="name" required>
        <UInput
          v-model="state.name"
          placeholder="es. Torneo #1"
          autofocus
          class="w-full"
        />
      </UFormField>

      <UFormField label="Data" name="date" required>
        <UInput
          v-model="state.date"
          type="date"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Numero di round" name="roundCount" required>
        <USelect
          v-model="state.roundCount"
          :items="roundCountOptions"
          value-key="value"
          label-key="label"
          placeholder="Seleziona i round"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Modalità di inserimento" name="entryMode" required>
        <div class="flex gap-2">
          <UButton
            type="button"
            :variant="state.entryMode === 'managed' ? 'solid' : 'outline'"
            color="primary"
            label="Automatica"
            icon="i-lucide-shuffle"
            @click="state.entryMode = 'managed'"
          />
          <UButton
            type="button"
            :variant="state.entryMode === 'manual' ? 'solid' : 'outline'"
            color="primary"
            label="Manuale"
            icon="i-lucide-pencil-line"
            @click="state.entryMode = 'manual'"
          />
        </div>
        <p class="text-xs text-muted mt-1">
          <template v-if="state.entryMode === 'managed'">I turni vengono generati automaticamente con pairing svizzero.</template>
          <template v-else>Inserisci direttamente V/P per ogni partecipante.</template>
        </p>
      </UFormField>

      <UAlert
        v-if="pairBlockInfo"
        color="blue"
        icon="i-lucide-info"
        :description="pairBlockInfo"
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
          label="Crea torneo"
          :loading="isPending"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { Tournament } from '~/types/domain'

const props = defineProps<{
  leagueId: string
  currentTournamentCount?: number
}>()

const emit = defineEmits<{
  saved: [tournament: Tournament]
  cancel: []
}>()

const { createTournament } = useTournament()

const state = reactive({
  name: '',
  date: new Date().toISOString().slice(0, 10), // today as default
  roundCount: 3 as number,
  entryMode: 'managed' as 'managed' | 'manual',
})

const roundCountOptions = [
  { label: '3 round', value: 3 },
  { label: '4 round', value: 4 },
]

const isPending = ref(false)
const serverError = ref('')

// Inform user which pair block this tournament will join
const pairBlockInfo = computed(() => {
  const count = props.currentTournamentCount ?? 0
  const block = Math.ceil((count + 1) / 2)
  const position = count % 2 === 0 ? 'primo' : 'secondo'
  return `Questo sarà il ${position} torneo nel blocco ${block}.`
})

async function onSubmit() {
  if (!state.name.trim() || !state.date) return
  isPending.value = true
  serverError.value = ''
  try {
    const result = await createTournament(props.leagueId, {
      name: state.name,
      date: state.date,
      roundCount: state.roundCount,
      entryMode: state.entryMode,
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
