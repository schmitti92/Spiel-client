# MiniGame Engine 2.0 (isolated foundation)

This directory is deliberately separate from `MinispieleV2/engine/` and the existing online shared lobby. No existing game is switched to this coordinator automatically.

## Current scope

`MiniGameEngine2.js` is a pure deterministic room/match state machine. It provides 1–4 frozen match seats, bot preset, spectator joins, fair waiting order, pre-countdown exclusion/promotion, instructions/3-second countdown, host actions, verified result collection, abort/invalidation, immutable completed-match summaries, command IDs, optimistic revision checks and per-viewer result hiding before completion.

## Critical integration requirements (not implemented yet)

- Authentication, session generations and secure reconnect must be enforced by the shared backend.
- Persist each state transition atomically with its command ID and event **before** acknowledging it. This module is not a durable ledger and its in-memory processed command list is not an adequate long-term deduplication store.
- Result verification is a trusted-server assertion; never accept `verified: true` directly from an untrusted client.
- Timer/disconnect deadlines, host ten-minute closure policy, protected-match terminal resolution, durable waitlist rotation, correction ledger and retention require a backend adapter and tests.
- Bots are roster placeholders here. Actual bot actions and game-specific scoring remain in the shared game contract and game reducer.
- Room closure, leave, results and other privileged commands must be bound to authenticated identities; the module's `actorId` alone is not authentication.
- Current module uses a single room revision. Independent match revision and cross-document atomic transitions are still future work.
- No UI, Firebase, WebSocket, Render, or online route is wired to this directory.
- Do not remove or alter legacy games, legacy engine, or existing lobby as part of this initial foundation.

## Tests

Run in a Node.js environment supporting `structuredClone` and ES modules:

```sh
node --test MinispieleV2/engine2/MiniGameEngine2.test.mjs
```

Tests cover initial roster, spectator join, fairness after a match, exclusion/promotion, countdown, stale commands, idempotency, result hiding and abort/close. Passing these tests does **not** establish online readiness or full compliance with all seven boundary cases.

## Integration order

1. Baseline existing engine/lobby tests.
2. Expand pure contract and game rule tests, especially bot action and technical disqualification semantics.
3. Add isolated V2 backend adapter with durable atomic command/event persistence.
4. Add authenticated reconnect, outage recovery, fair waitlist and host deadline tests.
5. Add game adapters, online integration tests and staged release.
