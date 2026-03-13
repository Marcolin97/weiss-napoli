<template>
  <UForm :state="state" @submit="onSubmit">
    <div class="space-y-4">
      <UFormField label="Nome" name="name" required :error="errorMessage || undefined">
        <UInput
          v-model="state.name"
          placeholder="es. Alice"
          autofocus
          class="w-full"
        />
      </UFormField>

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
          :label="player ? 'Salva modifiche' : 'Crea giocatore'"
          :loading="isPending"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { Player } from '~/types/domain'

const props = defineProps<{
  player?: Player
}>()

const emit = defineEmits<{
  saved: [player: Player]
  cancel: []
}>()

const { createPlayer, updatePlayer } = usePlayer()

const state = reactive({ name: props.player?.name ?? '' })
const isPending = ref(false)
const serverError = ref('')
const errorMessage = computed(() => state.name.trim() ? '' : 'Il nome è obbligatorio')

async function onSubmit() {
  if (!state.name.trim()) return
  isPending.value = true
  serverError.value = ''
  try {
    const result = props.player
      ? await updatePlayer(props.player.id, { name: state.name })
      : await createPlayer({ name: state.name })
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
