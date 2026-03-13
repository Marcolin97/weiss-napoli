<template>
  <UForm :state="state" @submit="onSubmit">
    <div class="space-y-4">
      <UFormField label="Nome" name="name" required>
        <UInput
          v-model="state.name"
          placeholder="es. Lega Primavera 2026"
          autofocus
          class="w-full"
        />
      </UFormField>

      <UFormField label="Descrizione" name="description">
        <UTextarea
          v-model="state.description"
          placeholder="Descrizione opzionale"
          :rows="3"
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
          :label="league ? 'Salva modifiche' : 'Crea lega'"
          :loading="isPending"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { League } from '~/types/domain'

const props = defineProps<{
  league?: League
}>()

const emit = defineEmits<{
  saved: [league: League]
  cancel: []
}>()

const { createLeague, updateLeague } = useLeague()

const state = reactive({
  name: props.league?.name ?? '',
  description: props.league?.description ?? '',
})
const isPending = ref(false)
const serverError = ref('')

async function onSubmit() {
  if (!state.name.trim()) return
  isPending.value = true
  serverError.value = ''
  try {
    const result = props.league
      ? await updateLeague(props.league.id, { name: state.name, description: state.description || undefined })
      : await createLeague({ name: state.name, description: state.description || undefined })
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
