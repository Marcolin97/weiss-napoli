# Copilot Instructions

## Project context

This repository contains a fullstack web application for managing Weiss Schwarz tournaments and leagues.

The application must be built with:
- Nuxt 4
- Nuxt UI
- anime.js

Use a single fullstack Nuxt architecture:
- frontend and backend inside the same Nuxt project
- API logic implemented with Nuxt server routes (`server/api`)
- business logic extracted into reusable server services/utils
- keep the architecture simple, maintainable, and strongly typed

For all business rules, standings logic, tournament constraints, and league scoring logic, treat `docs/domain-rules.md` as the authoritative source.

---

## Main goals

Build a tournament management system where:
- reusable players can be created and managed
- players can participate in tournaments
- tournaments belong to leagues
- each tournament records the climax trigger type used by each player
- tournaments support 3 or 4 rounds
- pairings follow standard TCG tournament logic
- draws do not exist
- rounds may include a bye
- tournament and league results must follow the business rules described in `docs/domain-rules.md`

---

## Required stack

- Framework: Nuxt 4
- Language: TypeScript
- UI: Nuxt UI
- Animation: anime.js
- Backend/API: Nuxt server routes
- Styling: Tailwind via Nuxt UI ecosystem
- Validation: schema-based validation for write operations
- Database: choose a Nuxt-friendly local-first solution
- Preferred DB approach: SQLite for local development
- Preferred ORM/query layer: use a TypeScript-friendly solution that works cleanly inside Nuxt

Preferred architectural direction:
- single Nuxt application
- no separate external backend unless explicitly requested
- no unnecessary external APIs
- no overengineered service mesh / microservice patterns

---

## Architecture rules

Organize the project clearly.

Recommended structure:
- `pages/` for application routes
- `components/` for reusable UI
- `composables/` for client-side reusable logic
- `types/` for shared domain types
- `server/api/` for route handlers
- `server/services/` for business rules and domain logic
- `server/db/` for database setup, schema, repositories
- `utils/` only for generic helpers, not domain-critical business logic
- `docs/` for domain documentation and rules

Keep business logic out of page components.
Keep API handlers thin.
Keep domain rules centralized in server services.
Do not duplicate the same scoring logic in multiple places.

---

## Coding rules

- Use TypeScript strictly
- Do not use `any` unless absolutely unavoidable
- Prefer explicit types and shared domain models
- Prefer small focused components
- Prefer composables for reusable UI state and client-side flows
- Prefer server services for tournament scoring, league standings, and pairing logic
- Use clear English names in code, files, functions, variables, and types
- Keep UI labels easy to translate later if localization is added
- Add comments only when the reasoning is not obvious
- Avoid placeholder code that pretends to be complete

---

## UI rules

Use Nuxt UI as the default component system.

The UI should feel like a clean modern admin/management interface:
- cards for summaries
- tables for standings and participants
- forms for creation/editing
- modals or drawers for quick actions
- tabs for league overview / tournaments / standings / stats
- badges for points, placements, trigger type, stars, and deck/set labels

Use anime.js only where it improves UX:
- page enter transitions
- subtle card/list transitions
- standings update highlight
- success feedback after save
- modal/drawer transitions

Do not overuse animation.
Animation must never hide or complicate tournament data.

---

## Product expectations for MVP

The first complete MVP should include:

### Player management
- create player
- edit player
- list players
- player detail view

### League management
- create league
- edit league
- list leagues
- league detail view

### Tournament management
- create tournament inside a league
- define tournament date and metadata
- define whether tournament has 3 or 4 rounds
- add participants from existing players
- assign one climax trigger type per participant
- register round results
- support bye rounds
- compute tournament standings
- determine tournament winner
- assign winner star

### League standings
- compute standings according to `docs/domain-rules.md`
- support league standings based on blocks/pairs of tournaments
- show total points
- show winner stars
- show tournament history
- show player performance across the league

---

## Domain modeling expectations

At minimum, model these concepts:
- Player
- League
- Tournament
- TournamentParticipation
- Round or Match
- ClimaxTriggerType
- LeagueStanding or derived league stats
- WinnerStar tracking, or an equivalent derived/recorded mechanism

The data model must support:
- players reused across many tournaments
- tournaments belonging to one league
- participations linking player and tournament
- one climax trigger type per participation
- tournaments with 3 or 4 rounds
- byes
- no draws
- league standings computed from paired tournament blocks

---

## Validation rules

All write operations must be validated server-side.

Validate at least:
- required fields
- tournament must belong to a valid league
- tournament rounds must be exactly 3 or 4
- participants must exist
- a player cannot be duplicated in the same tournament unless future rules explicitly allow it
- climax trigger type must be present for each participation
- round results must be coherent
- byes must follow the allowed tournament logic
- draws must not be allowed
- winner star must be assigned exactly once to the tournament winner
- league standings must be computed from authoritative tournament results, not manually edited

---

## Database guidance

Default to a simple local-first solution:
- SQLite preferred for local development
- schema should remain portable enough to migrate later if needed

Use normalized data structures for:
- players
- leagues
- tournaments
- tournament participations
- rounds / matches
- climax trigger types
- standings inputs or derived aggregates if needed

Use:
- primary keys
- foreign keys
- timestamps where useful (`createdAt`, `updatedAt`)
- clear uniqueness constraints when appropriate

Avoid storing derived standings data unless there is a clear reason.
Prefer deriving standings from tournament records.

---

## How Copilot should work in this repository

When implementing features:
1. Read and respect `docs/domain-rules.md`
2. Understand the requested feature before generating code
3. Prefer incremental implementation
4. Keep types, schema, API, and UI aligned
5. Centralize business rules in reusable server-side logic
6. Prefer correct domain behavior over speed of generation
7. If a domain rule is ambiguous, implement the safest extensible solution and keep the code easy to adjust

Always optimize for:
- correctness
- maintainability
- strong typing
- simple fullstack Nuxt structure
- reusable UI
- future extensibility

Do not optimize for:
- premature abstraction
- excessive dependencies
- enterprise patterns not needed by the MVP
- overcomplicated animation
- hidden business rules inside components