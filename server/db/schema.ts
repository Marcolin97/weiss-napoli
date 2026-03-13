import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Reusable timestamp columns
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
})

export const leagues = sqliteTable('leagues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ...timestamps,
})

// Seed-controlled table — values are defined in seed.ts
export const climaxTriggerTypes = sqliteTable('climax_trigger_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  label: text('label').notNull(),
})

export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(),
  leagueId: text('league_id')
    .notNull()
    .references(() => leagues.id),
  name: text('name').notNull(),
  date: text('date').notNull(), // ISO date string: YYYY-MM-DD
  roundCount: integer('round_count').notNull(), // must be 3 or 4 — enforced by CHECK in SQL + service validation
  pairBlockIndex: integer('pair_block_index').notNull(), // 1-based grouping index for league standings
  status: text('status', { enum: ['draft', 'active', 'finalized'] })
    .notNull()
    .default('draft'),
  entryMode: text('entry_mode', { enum: ['managed', 'manual'] }).notNull().default('managed'),
  winnerPlayerId: text('winner_player_id').references(() => players.id),
  ...timestamps,
})

export const tournamentParticipations = sqliteTable(
  'tournament_participations',
  {
    id: text('id').primaryKey(),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    climaxTriggerTypeId: text('climax_trigger_type_id')
      .notNull()
      .references(() => climaxTriggerTypes.id),
    climaxTriggerTypeId2: text('climax_trigger_type_id_2').references(() => climaxTriggerTypes.id),
    pointsEarned: integer('points_earned').notNull().default(0),
    finalPlacement: integer('final_placement'), // null until tournament is finalized
    isWinner: integer('is_winner', { mode: 'boolean' }).notNull().default(false),
    wasAbsent: integer('was_absent', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('tournament_player_unique').on(table.tournamentId, table.playerId),
  ],
)

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id),
  roundNumber: integer('round_number').notNull(),
  player1Id: text('player1_id').references(() => players.id),
  player2Id: text('player2_id').references(() => players.id),
  winnerPlayerId: text('winner_player_id').references(() => players.id),
  isBye: integer('is_bye', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
})
