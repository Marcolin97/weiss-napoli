import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import * as schema from './schema'

const dbPath = resolve(process.env.DATABASE_URL ?? './data/app.db')

const dbDir = dirname(dbPath)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const client = createClient({ url: `file:${dbPath}` })

export const db = drizzle(client, { schema })

/**
 * Creates all tables if they do not exist.
 * Called once at server startup via the 00.db plugin.
 */
export async function initializeDatabase(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS leagues (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS climax_trigger_types (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      UNIQUE (name)
    )`,
    `CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY NOT NULL,
      league_id TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      round_count INTEGER NOT NULL CHECK (round_count IN (3, 4)),
      pair_block_index INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'finalized')),
      winner_player_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (league_id) REFERENCES leagues(id),
      FOREIGN KEY (winner_player_id) REFERENCES players(id)
    )`,
    `CREATE TABLE IF NOT EXISTS tournament_participations (
      id TEXT PRIMARY KEY NOT NULL,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      climax_trigger_type_id TEXT NOT NULL,
      points_earned INTEGER NOT NULL DEFAULT 0,
      final_placement INTEGER,
      is_winner INTEGER NOT NULL DEFAULT 0 CHECK (is_winner IN (0, 1)),
      was_absent INTEGER NOT NULL DEFAULT 0 CHECK (was_absent IN (0, 1)),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE (tournament_id, player_id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (climax_trigger_type_id) REFERENCES climax_trigger_types(id)
    )`,
    `CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY NOT NULL,
      tournament_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      player1_id TEXT,
      player2_id TEXT,
      winner_player_id TEXT,
      is_bye INTEGER NOT NULL DEFAULT 0 CHECK (is_bye IN (0, 1)),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id),
      FOREIGN KEY (winner_player_id) REFERENCES players(id)
    )`,
  ]

  for (const sql of statements) {
    await client.execute(sql)
  }

  // Migration: add second climax trigger type column
  try {
    await client.execute(`ALTER TABLE tournament_participations ADD COLUMN climax_trigger_type_id_2 TEXT REFERENCES climax_trigger_types(id)`)
  } catch {
    // Column already exists — safe to ignore
  }

  // Migration: add entry_mode column to tournaments
  try {
    await client.execute(`ALTER TABLE tournaments ADD COLUMN entry_mode TEXT NOT NULL DEFAULT 'managed' CHECK (entry_mode IN ('managed', 'manual'))`)
  } catch {
    // Column already exists — safe to ignore
  }
}