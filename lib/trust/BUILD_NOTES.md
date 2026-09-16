# Build notes — trust score & release gate

## Interpretation: execution-score weights

§0 defines criticality weights for the *confidence ceiling* (critical −15,
major −7, minor −2) and says the execution score is “weighted by
criticality” without a second table. Interpretation: reuse the same
weights for execution so one criticality scale drives both numbers.
Composed journeys use the average weight of active ACs.

## Interpretation: gate_decisions on soft/hard stop

The `gate_decisions` enum is `auto_ship | approved | overridden`. Soft
and hard stops are not written as gate rows until a human acts in the
portal; only the clean auto-ship path inserts a row immediately, matching
§7’s “logged the same as any other gate decision” for the automatic case.
