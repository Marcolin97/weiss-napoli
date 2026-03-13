# MVP Scope

## Objective

Build the first usable MVP of a Weiss Schwarz league and tournament management application.

The MVP must support:
- reusable player profiles
- leagues
- tournaments inside leagues
- tournament participants selected from existing players
- climax trigger type registration for each participant in each tournament
- 3-round or 4-round tournaments
- round result registration
- tournament ranking
- tournament winner tracking
- winner star assignment
- league standings based on best result in each consecutive pair of tournaments

---

## Must-have features

### 1. Player management
- create player
- edit player
- list players
- view player detail

### 2. League management
- create league
- edit league
- list leagues
- view league detail

### 3. Tournament management
- create tournament inside a league
- define tournament date
- define round count: 3 or 4
- assign tournament pair block automatically or manually depending on implementation choice
- add participants from existing players
- register one climax trigger type per participant
- support absent players in league history where relevant

### 4. Round management
- create pairings for each round
- support bye
- no draws allowed
- register winner for each match
- compute points automatically from wins

### 5. Tournament results
- compute final tournament standings
- compute points earned by each participant
- determine tournament winner
- assign exactly one winner star to the winner

### 6. League standings
- group tournaments into consecutive pairs
- for each player, select the best result in each pair
- sum selected pair-best results for total league points
- aggregate winner stars across the whole league
- show full tournament history in addition to league totals

---

## Out of scope for first MVP

Do not implement unless explicitly requested:
- authentication / login system
- roles and permissions
- public player portal
- real-time updates
- advanced Swiss tie-breakers
- import/export
- PDF generation
- notifications
- mobile app packaging
- multilingual support
- decklist management beyond the required trigger-related data
- advanced analytics
- external APIs

---

## Suggested page list

### Core pages
- `/players`
- `/players/[id]`
- `/leagues`
- `/leagues/[id]`
- `/leagues/[id]/tournaments/new`
- `/tournaments/[id]`
- `/tournaments/[id]/rounds`
- `/tournaments/[id]/results`

### Suggested league detail sections
- Overview
- Tournaments
- Standings
- Player stats

### Suggested tournament detail sections
- Info
- Participants
- Rounds
- Final standings

---

## Suggested implementation order

### Phase 1
- project setup
- database setup
- shared domain types
- core schema
- seed or base data helpers for climax trigger types

### Phase 2
- player CRUD
- league CRUD

### Phase 3
- tournament creation
- participant registration
- climax trigger assignment

### Phase 4
- rounds and results
- bye handling
- tournament scoring
- tournament final ranking
- winner star assignment

### Phase 5
- league standings based on pair-best logic
- league summary UI
- tournament history UI

### Phase 6
- UX polish with Nuxt UI and anime.js
- validation refinement
- empty states
- error handling

---

## MVP success criteria

The MVP is successful when a user can:
1. create players
2. create a league
3. create multiple tournaments inside the league
4. assign players to tournaments
5. record each player's climax trigger type for each tournament
6. record round winners including byes
7. finalize a tournament with points and winner
8. see league standings based on best result per tournament pair
9. see winner stars accumulated in league history
10. review full tournament history for each player