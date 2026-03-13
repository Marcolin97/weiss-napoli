# Domain Rules

## Purpose

This document defines the business rules for the Weiss Schwarz league and tournament management system.

This file is the authoritative source for:
- tournament structure
- pairing assumptions
- round and result rules
- climax trigger registration
- winner star assignment
- league standings calculation

If implementation decisions conflict with this document, this document takes priority.

---

## Core domain concepts

### Player
A reusable participant profile.
A player can participate in many tournaments across one or more leagues.

### League
A league contains multiple tournaments.
League standings are calculated from tournament results using the pairing/block logic described below.

### Tournament
A tournament belongs to exactly one league.
A tournament has:
- a name
- a date
- a round count
- participants
- round results
- a final ranking
- one winner

### Tournament Participation
A participation links:
- one player
- one tournament

A participation also stores:
- the climax trigger type used by that player in that tournament
- points earned in that tournament
- final placement when determined
- additional tournament stats if needed later

### Round / Match
A tournament is composed of rounds.
Each round contains pairings or a bye assignment.
Draws do not exist.

### Climax Trigger Type
Each player must register exactly one climax trigger type for each tournament participation.

This data is tournament-specific, not global to the player.

### Winner Star
When a player wins a tournament, that result grants exactly 1 winner star.
Winner stars are meaningful in the context of the league.

---

## Tournament structure rules

### Number of rounds
A tournament must have exactly:
- 3 rounds, or
- 4 rounds

No other round count is valid for the current system.

### Pairing logic
Pairings follow normal TCG tournament logic.

Practical meaning for implementation:
- players are paired round by round according to standard tournament progression logic
- pairings should avoid arbitrary/random behavior once results exist
- later rounds should depend on current standings / points structure
- if the system later needs a more formal Swiss-style implementation, the model must be easy to extend

For MVP:
- pairings should follow a standard score-based TCG approach
- avoid repeated pairings if reasonably possible
- keep pairing logic server-side and centralized

### Bye support
A round may include a bye.

Rules for bye:
- a bye is allowed when participant count requires it
- a bye counts as a valid round result
- the exact scoring value of the bye should be treated as equivalent to a round win unless a later explicit rule changes this
- byes must be tracked explicitly, not hidden as missing data

### Draws
Draws do not exist.
Every played match must produce a winner and a loser, or a bye where applicable.

---

## Scoring rules

### Match win points
Each match win is worth:
- **3 points**

This is a fixed rule.

### Tournament points
Tournament points are calculated from round results.

Base rule:
- each win gives 3 points
- no draw points exist
- a bye is treated as a valid winning result for scoring purposes unless future rules explicitly change that

Example:
- 3 wins = 9 points
- 2 wins = 6 points
- 1 win = 3 points
- 0 wins = 0 points

### Tournament winner
Each tournament must produce one winner.

The system must store:
- winner player id
- winner placement = 1
- winner star granted for that tournament

### Winner star assignment
When a player wins a tournament:
- assign exactly **1 winner star**
- the star belongs to that player's history inside the league
- the same tournament must not assign multiple winner stars to the same player
- each tournament contributes at most one winner star total

---

## Participation rules

### Reusable players
Players are reusable profiles and must not be recreated every time they join a new tournament.

### Tournament participation uniqueness
For the MVP, assume:
- one player can participate only once in the same tournament

So:
- `(tournamentId, playerId)` should be unique

### Climax trigger registration
For each participation:
- exactly one climax trigger type must be registered
- it must be attached to that specific tournament participation
- it must be stored even if the player performs poorly or leaves no long-term ranking impact

This means the system must always preserve trigger usage history per tournament.

---

## League rules

### League composition
A league contains an ordered series of tournaments.

The current intended structure follows grouped tournament pairs.

Example structure:
- tournament 1 + tournament 2 = pair block 1
- tournament 3 + tournament 4 = pair block 2
- tournament 5 + tournament 6 = pair block 3

The system must support league standings that are based on these paired tournament blocks.

### League standings principle
League results depend on the **best result of each player within each pair of tournaments**.

This is a core rule.

For every pair block:
- look at the player's result in the first tournament of the pair
- look at the player's result in the second tournament of the pair
- keep only the **best** result for that player for league-standing purposes for that pair

Then:
- sum the selected best results across all tournament pairs in the league
- this produces the player's league points total
- winner stars are tracked alongside league points

### Best-result interpretation
For the MVP, "best result" in a pair should be based primarily on the tournament points earned by the player in that tournament.

So for each pair:
- choose the tournament where the player earned more points
- if the player was absent from one tournament and played the other, the played result is the best result
- if the player was absent from both tournaments, the pair contributes 0 points

### Ties inside a pair
If a player gets the same tournament points in both tournaments of the same pair, use this tie-break priority:

1. better final placement
2. tournament win in that pair
3. latest tournament in the pair
4. if still tied, keep deterministic stable ordering in code

This tie-break order should be implemented in a way that can be changed later if needed.

### Winner stars in league context
Winner stars are not reduced to the pair-best selection rule.

They must remain part of the player's total league history.

Meaning:
- if a player wins a tournament, they get the winner star for that tournament
- the star is kept in league stats even if that tournament's points are not the selected "best result" for the pair

---

## Example interpretation of the current manual tracking

The current spreadsheet-style tracking suggests:
- tournaments are grouped in consecutive pairs
- league total is built from the best performance inside each pair
- winner stars are shown separately and contribute to the player's league profile/history
- tournament history remains visible even when only one result per pair is selected for total league scoring

The application should preserve this model:
- full tournament history visible
- league total calculated from pair-best results
- winner stars accumulated across the league

---

## Tournament ranking rules

### Tournament placement
Each tournament should produce a final ranking of participants.

Primary ranking factor:
- total tournament points

Suggested tie-break structure for MVP:
1. tournament points
2. opponent score or a future tie-break placeholder if implemented
3. direct deterministic fallback for stable sorting

The system should be coded so tie-break logic can be extended later.

### Absence
A player can be absent from a tournament.
An absent player:
- is not considered an active participant in round pairings
- receives no tournament points for that tournament
- can still remain part of the league history

Absence should be explicit in league history and tournament views when relevant.

---

## Data modeling requirements

The data model must support at least:

### Players
- id
- display name
- createdAt
- updatedAt

### Leagues
- id
- name
- description optional
- createdAt
- updatedAt

### Tournaments
- id
- leagueId
- name
- date
- roundCount (3 or 4 only)
- pairBlockIndex or equivalent grouping field
- winnerPlayerId optional until finalized
- createdAt
- updatedAt

### Tournament participations
- id
- tournamentId
- playerId
- climaxTriggerTypeId or equivalent stored value
- pointsEarned
- finalPlacement optional until finalized
- isWinner
- wasAbsent if needed
- createdAt
- updatedAt

### Rounds / matches
- id
- tournamentId
- roundNumber
- player1Id optional when bye exists
- player2Id optional when bye exists
- winnerPlayerId
- isBye
- createdAt
- updatedAt

### Climax trigger types
The system should support a controlled set of trigger types, but the implementation should remain flexible enough to adjust labels or add new trigger types later.

---

## Validation requirements

The system must validate:

### Tournament creation
- league exists
- round count is 3 or 4 only
- tournament date is valid
- tournament pair grouping is valid

### Participation registration
- player exists
- tournament exists
- one participation per player per tournament
- climax trigger type is present
- absence state is coherent

### Round result registration
- round number valid
- players belong to the tournament
- winner belongs to the match
- bye is structurally valid
- no draw result can be saved

### Tournament finalization
- all needed results are present
- winner is coherent with standings
- winner star assigned once
- final placements are coherent

### League standings calculation
- standings must be derived from tournament data
- each pair contributes at most one selected result per player
- winner stars aggregate independently from pair-best scoring
- absences are handled explicitly

---

## Derived statistics and views

The system should support derived views such as:
- league total points
- winner star count
- player tournament history
- best result selected for each tournament pair
- tournaments played
- absences
- most-used climax trigger type if later needed
- favorite or best-performing set/deck if later modeled

These should preferably be derived from authoritative records, not manually edited.

---

## Implementation notes

### Server-side authority
All important calculations must happen server-side:
- tournament points
- tournament winner
- final placements
- league standings
- pair-best result selection
- winner stars aggregation

### UI expectations
The UI should show:
- complete tournament history
- pair-grouped league view
- clearly highlighted selected best result for each pair
- winner stars separately visible
- standings tables understandable at a glance

### Extensibility
Code should remain ready for future extensions such as:
- more formal Swiss tie-breakers
- richer opponent statistics
- deck/set registration beyond trigger type
- exportable standings
- per-league configuration rules