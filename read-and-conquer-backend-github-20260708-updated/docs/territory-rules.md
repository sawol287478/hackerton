# Influence Rules

## Core Rule

Library ownership is decided by faction influence, not by a single mutable HP bar.

1. A successful reading completion grants the user's faction `25` influence for that library.
2. The latest per-library, per-faction score is stored in `library_influences.influence_score`.
3. Every reward application is recorded in `influence_logs`.
4. The faction with the highest `influence_score` becomes `libraries.current_occupied_faction_id`.
5. If two or more factions are tied for first place, the current occupying faction keeps ownership when it is one of the tied factions.

## Why This Changed

The old HP model mixed two concepts:

- Current owner state.
- Historical faction contribution totals.

The updated ERD separates them:

- `libraries.current_occupied_faction_id`: visible owner on the map.
- `library_influences`: current score by faction and library.
- `influence_logs`: immutable audit trail for reward, defense, and occupation changes.

This keeps library detail, ranking, and completion logic consistent because they all read the same influence scores.

## Action Types

- `INFLUENCE_GAINED`: the acting faction already owns the library and gains more influence.
- `OCCUPATION_MAINTAINED`: the acting faction gains influence but another faction still owns the library.
- `OCCUPATION_CHANGED`: the acting faction's score changes the library owner.

## Completion Transaction

`POST /api/sessions/{sessionId}/complete` runs in one serializable transaction:

1. Validate session ownership, reading time, page range, location validity, and AI verification.
2. Upsert `ai_verifications`.
3. Increment `library_influences` for the user's faction.
4. Resolve the winning faction and update `libraries.current_occupied_faction_id`.
5. Insert an `influence_logs` row.
6. Mark the session as `VERIFICATION_PASSED`.
7. Increment user EXP and faction score.
8. Refresh `user_rankings`.
