<template>
  <UForm :state="state" @submit="onSubmit">
    <div class="space-y-4">
      <UFormField label="Nome visualizzato" name="label" required>
        <UInput
          v-model="state.label"
          placeholder="es. Soul"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UFormField
        label="Identificatore interno"
        name="name"
        :hint="nameHint"
      >
        <UInput
          v-model="state.name"
          placeholder="generato automaticamente"
          class="w-full font-mono"
        />
        <template #help>
          <span class="text-xs text-muted">Lascia vuoto per generarlo dal nome. Solo lettere minuscole, numeri e underscore.</span>
        </template>
      </UFormField>

      <UAlert
        v-if="serverError"
        color="error"
        icon="i-lucide-alert-circle"
        :description="serverError"
        variant="soft"
      />

      <div class="flex justify-end gap-2 pt-2">
        <UButton type="button" label="Annulla" variant="ghost" color="neutral" @click="$emit('cancel')" />
        <UButton
          type="submit"
          :label="isEdit ? 'Salva modifiche' : 'Aggiungi'"
          :loading="isPending"
          :disabled="isPending || !state.label.trim()"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { ClimaxTriggerType } from '~/types/domain'

const props = defineProps<{
  triggerType?: ClimaxTriggerType
}>()

const emit = defineEmits<{
  saved: [t: ClimaxTriggerType]
  cancel: []
}>()

const isEdit = computed(() => !!props.triggerType)

const state = reactive({
  label: props.triggerType?.label ?? '',
  name: props.triggerType?.name ?? '',
})

const isPending = ref(false)
const serverError = ref('')

const nameHint = computed(() => {
  if (state.name.trim()) return undefined
  const auto = state.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  return auto ? `Verrà usato: "${auto}"` : undefined
})

async function onSubmit() {
  if (!state.label.trim()) return
  isPending.value = true
  serverError.value = ''
  try {
    const payload = { label: state.label.trim(), name: state.name.trim() || undefined }
    let result: ClimaxTriggerType
    if (isEdit.value && props.triggerType) {
      result = await $fetch<ClimaxTriggerType>(`/api/climax-trigger-types/${props.triggerType.id}`, {
        method: 'PUT',
        body: payload,
      })
    }
    else {
      result = await $fetch<ClimaxTriggerType>('/api/climax-trigger-types', {
        method: 'POST',
        body: payload,
      })
    }
    emit('saved', result)
  }
  catch (e: unknown) {
    serverError.value = (e as { data?: { message?: string } })?.data?.message ?? 'Qualcosa è andato storto'
  }
  finally {
    isPending.value = false
  }
}
</script>
