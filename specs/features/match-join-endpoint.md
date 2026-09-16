---
id: match-join-endpoint
title: Match Join Endpoint
surfaces: [api]
layer: api
version: 1
status: draft
source: <link to ideation conversation>
last_updated: 2026-09-16
related_specs: [join-live-match]
retry_cap: null
release_threshold: null
---

## Summary
Backend endpoint that adds a user to a live match's viewer list and
returns current board state.

## Preconditions
- User is authenticated
- Match exists

## Acceptance Criteria

### AC-01 — Successful join [critical]
- Given a live match under capacity
- When a join request is received
- Then the response is 200 with board state and viewer count
- And the viewer count increments by 1

## Edge Cases

### EC-01 (ref: AC-01) — Match at capacity
- Given the match is at max viewers
- When a join request is received
- Then the response is 409
- And viewer count does not increment

## Interface Contract
- POST /matches/{id}/join
- Request: { userId }
- Response 200: { boardState, viewerCount }
- Response 409: match full
- Response 401: not authenticated

## Out of Scope
- Rate limiting (tracked separately)
