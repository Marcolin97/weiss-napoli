# WS League Manager

Fullstack Weiss Schwarz league and tournament management application built with Nuxt 4.

## Tech Stack

- [Nuxt 4](https://nuxt.com) — fullstack framework
- [Nuxt UI](https://ui.nuxt.com) — component system (Tailwind CSS v4)
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — local SQLite database
- [anime.js](https://animejs.com) — UI animations
- TypeScript (strict)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start development server
#    The database is initialised automatically on first run.
npm run dev
```

The app will be available at http://localhost:3000.

## Database

The SQLite database file is created automatically at `./data/app.db` on first startup.
Climax trigger types are seeded automatically.

To browse the database with a GUI:

```bash
npm run db:studio
```

To regenerate migrations after schema changes:

```bash
npm run db:push       # push schema changes directly (development)
npm run db:generate   # generate migration files
```

## Project Structure

```
app/                  # Frontend (pages, components, composables, layouts)
server/
  api/                # Thin API route handlers
  db/                 # Schema, DB singleton, seed data
  services/           # Business logic (scoring, pairings, standings)
  plugins/            # Server startup plugins (DB init)
  utils/              # Server-side helpers
types/
  domain.ts           # Shared TypeScript domain interfaces
docs/
  domain-rules.md     # Authoritative business rules
  mvp-scope.md        # MVP feature scope
```

## Domain Rules

All business logic follows `docs/domain-rules.md`. Key rules:

- Tournaments have exactly 3 or 4 rounds
- Each match win is worth **3 points**; no draws exist
- Byes count as a win
- League standings use the **best result per consecutive tournament pair**
- Winner stars are tracked independently from pair-best scoring
