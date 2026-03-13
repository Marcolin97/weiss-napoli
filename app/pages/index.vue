<template>
  <div>
    <div ref="heroRef" class="mb-8">
      <h1 class="text-3xl font-bold mb-1">League Manager</h1>
      <p class="text-muted">Gestisci le tue leghe, tornei e classifiche Weiss Schwarz.</p>
    </div>

    <div ref="cardsRef" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UCard v-for="section in sections" :key="section.to">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="section.icon" class="text-primary text-xl" />
            <span class="font-semibold">{{ section.title }}</span>
          </div>
        </template>
        <p class="text-sm text-muted mb-4">{{ section.description }}</p>
        <UButton :to="section.to" :label="section.action" size="sm" />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAnime } from '~/composables/useAnime'

const heroRef = ref<HTMLElement | null>(null)
const cardsRef = ref<HTMLElement | null>(null)
const { fadeIn, staggerIn } = useAnime()

onMounted(() => {
  if (heroRef.value) fadeIn(heroRef.value)
  if (cardsRef.value) staggerIn(cardsRef.value.children as unknown as string, 300, 80)
})

const sections = [
  {
    title: 'Giocatori',
    icon: 'i-lucide-users',
    description: 'Crea e gestisci profili giocatore riutilizzabili in tutte le leghe.',
    action: 'Vai ai giocatori',
    to: '/players',
  },
  {
    title: 'Leghe',
    icon: 'i-lucide-trophy',
    description: 'Organizza i tornei in leghe e monitora le classifiche.',
    action: 'Vai alle leghe',
    to: '/leagues',
  },
  {
    title: 'Tornei',
    icon: 'i-lucide-calendar',
    description: 'Gestisci tornei, registra i round e calcola le classifiche finali.',
    action: 'Vai ai tornei',
    to: '/tournaments',
  },
]
</script>
