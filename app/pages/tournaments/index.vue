<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Tournaments</h1>
        <p class="text-muted text-sm">Tournaments are created and managed inside each league.</p>
      </div>
    </div>

    <UCard>
      <div class="flex flex-col items-center justify-center py-16 text-center gap-3">
        <UIcon name="i-lucide-calendar" class="text-4xl text-muted" />
        <p class="font-medium">Browse tournaments from a league</p>
        <p class="text-sm text-muted">Go to a league to view and create its tournaments.</p>
        <UButton to="/leagues" label="Go to Leagues" icon="i-lucide-trophy" size="sm" variant="soft" />
      </div>
    </UCard>
  </div>
</template>
