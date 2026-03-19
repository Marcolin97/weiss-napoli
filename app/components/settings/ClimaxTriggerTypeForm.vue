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

      <!-- Image section — only available in edit mode after creation -->
      <UFormField v-if="isEdit" label="Immagine" name="image">
        <div class="space-y-2">
          <!-- Current image preview -->
          <div v-if="currentImageUrl" class="flex items-center gap-3">
            <img
              :src="currentImageUrl"
              :alt="state.label"
              class="w-12 h-12 object-contain rounded border border-default bg-muted/20"
            />
            <UButton
              label="Rimuovi"
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              :loading="isRemovingImage"
              @click="handleRemoveImage"
            />
          </div>

          <!-- Upload new image -->
          <div class="flex items-center gap-2">
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              class="hidden"
              @change="handleFileSelected"
            />
            <UButton
              :label="currentImageUrl ? 'Sostituisci immagine' : 'Carica immagine'"
              icon="i-lucide-upload"
              size="sm"
              variant="soft"
              color="neutral"
              type="button"
              :loading="isUploadingImage"
              @click="fileInput?.click()"
            />
            <span v-if="selectedFileName" class="text-xs text-muted">{{ selectedFileName }}</span>
          </div>
          <p class="text-xs text-muted">JPG, PNG, GIF, WEBP o SVG — max 2 MB</p>
        </div>
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
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const isUploadingImage = ref(false)
const isRemovingImage = ref(false)
const currentImageUrl = ref<string | null>(props.triggerType?.imageUrl ?? null)

const nameHint = computed(() => {
  if (state.name.trim()) return undefined
  const auto = state.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  return auto ? `Verrà usato: "${auto}"` : undefined
})

async function handleFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !props.triggerType) return

  selectedFileName.value = file.name
  isUploadingImage.value = true
  serverError.value = ''

  try {
    const formData = new FormData()
    formData.append('image', file)
    const result = await $fetch<ClimaxTriggerType>(`/api/climax-trigger-types/${props.triggerType.id}/image`, {
      method: 'POST',
      body: formData,
    })
    currentImageUrl.value = result.imageUrl
    emit('saved', result)
  }
  catch (e: unknown) {
    serverError.value = (e as { data?: { message?: string } })?.data?.message ?? 'Errore nel caricamento immagine'
  }
  finally {
    isUploadingImage.value = false
    selectedFileName.value = ''
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function handleRemoveImage() {
  if (!props.triggerType) return
  isRemovingImage.value = true
  serverError.value = ''
  try {
    const result = await $fetch<ClimaxTriggerType>(`/api/climax-trigger-types/${props.triggerType.id}/image`, {
      method: 'DELETE',
    })
    currentImageUrl.value = null
    emit('saved', result)
  }
  catch (e: unknown) {
    serverError.value = (e as { data?: { message?: string } })?.data?.message ?? 'Errore nella rimozione immagine'
  }
  finally {
    isRemovingImage.value = false
  }
}

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
