import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${process.env.DATABASE_URL ?? './data/app.db'}`,
  },
} satisfies Config
