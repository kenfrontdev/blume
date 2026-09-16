---
id: join-live-match
title: Join a Live Match
surfaces: [web, ios]
layer: ui
version: 1
status: draft
source: <link to ideation conversation>
last_updated: 2026-09-16
related_specs: [match-join-endpoint]
retry_cap: null
release_threshold: null
---

## Summary
A spectator joins a live carrom match in progress and sees the board
update in real time.

## Preconditions
- User is authenticated
- A live match exists and is joinable

## Acceptance Criteria

### AC-01 — Spectator joins successfully [critical]
- Given a live match is in progress
- When the user taps "Join"
- Then the board renders within 2 seconds
- And the user is added to the live viewer count

### AC-02 — Match ends while spectating [major]
- Given the user is spectating a live match
- When the match ends
- Then the user sees a "Match complete" state
- And is offered a link to the results screen

## Edge Cases

### EC-01 (ref: AC-01) — Match becomes full mid-join
- Given the match reaches max spectators as the user taps "Join"
- When the join request completes
- Then the user sees a "Match is full" message
- And is offered similar live matches

### EC-02 (ref: AC-01) — Network drops during join
- Given the user taps "Join"
- When the network request times out
- Then the user sees a retry option
- And no partial join state is left behind

## UI States

### Web
- loading: skeleton board placeholder, max 2s
- empty: "No live matches right now" with a refresh action
- error: inline banner, non-blocking, retry button
- success: full board renders, live viewer count visible

### iOS
- loading: native spinner over dimmed board
- empty: same copy as web, platform-native empty-state illustration
- error: toast, auto-dismiss after 4s
- success: same as web

## Out of Scope
- Spectator chat (tracked separately)
- Replay/rewind of an already-joined match
