// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  colorMode: { preference: 'dark' },

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
  },

  runtimeConfig: {
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? '',
  },

  nitro: {
    // Prevent Nitro from bundling @libsql native modules (prebuilt binaries)
    externals: {
      external: ['@libsql/client'],
    },
  },
})
