<template>
  <div>
    <div ref="headerRef" class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Impostazioni</h1>
        <p class="text-muted text-sm">Gestisci i dati di configurazione dell'applicazione.</p>
      </div>
    </div>

    <!-- Climax Trigger Types -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-zap" class="text-primary" />
            <span class="font-semibold">Tipi di Climax Trigger</span>
            <UBadge :label="String(triggerTypes?.length ?? 0)" color="neutral" variant="soft" size="sm" />
          </div>
          <UButton
            label="Aggiungi"
            icon="i-lucide-plus"
            size="sm"
            @click="openAdd"
          />
        </div>
      </template>

      <div v-if="(triggerTypes?.length ?? 0) === 0" class="flex flex-col items-center justify-center py-10 text-center gap-2">
        <UIcon name="i-lucide-zap" class="text-3xl text-muted" />
        <p class="text-sm text-muted">Nessun tipo trigger ancora.</p>
      </div>

      <div v-else class="divide-y divide-default">
        <div
          v-for="t in triggerTypes"
          :key="t.id"
          class="flex items-center justify-between py-3 px-1"
        >
          <div class="flex items-center gap-3">
            <UBadge :label="t.label" color="primary" variant="soft" />
            <span class="text-xs text-muted font-mono">{{ t.name }}</span>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Modifica"
              @click="openEdit(t)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              aria-label="Elimina"
              @click="confirmDelete(t)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Add modal -->
    <UModal v-model:open="isAddOpen" title="Aggiungi tipo trigger">
      <template #body>
        <SettingsClimaxTriggerTypeForm
          @saved="onSaved"
          @cancel="isAddOpen = false"
        />
      </template>
    </UModal>

    <!-- Edit modal -->
    <UModal v-model:open="isEditOpen" title="Modifica tipo trigger">
      <template #body>
        <SettingsClimaxTriggerTypeForm
          v-if="editing"
          :trigger-type="editing"
          @saved="onSaved"
          @cancel="isEditOpen = false"
        />
      </template>
    </UModal>

    <!-- Delete confirm modal -->
    <UModal v-model:open="isDeleteOpen" title="Elimina tipo trigger">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm">
            Sei sicuro di voler eliminare il tipo trigger
            <span class="font-semibold">{{ deleting?.label }}</span>?
          </p>
          <UAlert
            v-if="deleteError"
            color="error"
            icon="i-lucide-alert-circle"
            :description="deleteError"
            variant="soft"
          />
          <p class="text-xs text-muted">
            L'eliminazione è bloccata se il tipo trigger è già in uso in un torneo.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Annulla" variant="ghost" color="neutral" @click="isDeleteOpen = false" />
          <UButton
            label="Elimina"
            color="error"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ClimaxTriggerType } from '~/types/domain'

const { data: triggerTypes, refresh } = await useFetch<ClimaxTriggerType[]>('/api/climax-trigger-types')

const headerRef = ref<HTMLElement | null>(null)
const { fadeIn } = useAnime()

onMounted(() => {
  if (headerRef.value) fadeIn(headerRef.value)
})

// ── Add ──────────────────────────────────────────────────────────────────────
const isAddOpen = ref(false)
function openAdd() { isAddOpen.value = true }

// ── Edit ─────────────────────────────────────────────────────────────────────
const isEditOpen = ref(false)
const editing = ref<ClimaxTriggerType | null>(null)
function openEdit(t: ClimaxTriggerType) {
  editing.value = t
  isEditOpen.value = true
}

// ── Shared saved handler ──────────────────────────────────────────────────────
async function onSaved() {
  isAddOpen.value = false
  isEditOpen.value = false
  editing.value = null
  await refresh()
}

// ── Delete ────────────────────────────────────────────────────────────────────
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const deleting = ref<ClimaxTriggerType | null>(null)
const deleteError = ref('')

function confirmDelete(t: ClimaxTriggerType) {
  deleting.value = t
  deleteError.value = ''
  isDeleteOpen.value = true
}

async function handleDelete() {
  if (!deleting.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/climax-trigger-types/${deleting.value.id}`, { method: 'DELETE' })
    isDeleteOpen.value = false
    deleting.value = null
    await refresh()
  }
  catch (e: unknown) {
    deleteError.value = (e as { data?: { message?: string } })?.data?.message ?? 'Errore durante l\'eliminazione'
  }
  finally {
    isDeleting.value = false
  }
}
</script>
