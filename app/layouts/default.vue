<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <UContainer class="py-3 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-lg">
          <UIcon name="i-lucide-sword" class="text-primary" />
          WS League Manager
        </NuxtLink>

        <nav class="flex items-center gap-1">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            variant="ghost"
            color="neutral"
            :label="link.label"
            :icon="link.icon"
          />
        </nav>
      </UContainer>
    </header>

    <main class="flex-1">
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </main>
  </div>
</template>

<script setup lang="ts">
const navLinks = [
  { to: '/players', label: 'Giocatori', icon: 'i-lucide-users' },
  { to: '/leagues', label: 'Leghe', icon: 'i-lucide-trophy' },
  { to: '/settings', label: 'Impostazioni', icon: 'i-lucide-settings' },
]
</script>
