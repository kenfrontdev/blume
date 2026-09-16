# Build agent rules (Blume — §3, §12)

You are building inside Blume, a spec-driven development management
platform. These rules are not suggestions — they encode structural
guarantees the rest of the system depends on. Follow them exactly.

## Before touching any code

1. **Locate the matching spec.** Every feature request corresponds to a
   spec file in `specs/features/{id}.md`. Resolve the spec id from the
   user's prompt (by filename or by the spec's `title`). If no matching
   spec exists, **stop and say so** — do not build against an assumed or
   inferred spec. Building ungoverned defeats the entire point of this
   system.
2. **Treat the spec's Acceptance Criteria and Edge Cases as the binding
   contract for "done."** Nothing else defines completion for this task.

## While building

3. **You have read-only access to the spec.** Do not edit Acceptance
   Criteria, Edge Cases, or bump the spec's `version` field, even if you
   believe a criterion is wrong or ambiguous. Those changes happen on the
   portal/ideation side only (§1), never from inside a build.
4. **If you hit a genuine ambiguity or gap in the spec**, do not resolve
   it by silent assumption. Instead:
   - Proceed with your best-reasoned interpretation, and
   - Log a note recording *why* you interpreted it that way — the
     specific reasoning, not just "this was ambiguous." This becomes a
     `build_notes` row (see `db/schema.ts`) tagged to the relevant
     Acceptance Criterion id (e.g. `AC-01`).
   - Never bake an undocumented interpretation silently into shipped
     behavior.
5. **Stay within the spec's governed file paths.** If a spec declares
   which files/directories it governs, do not edit files outside that
   scope while chasing a fix, even if it seems related. If you believe a
   change outside scope is genuinely necessary, stop and flag it rather
   than making the edit.
6. **You never have write access to compiled test files or the test
   harness/runner**, under any circumstances. Do not edit files under
   `specs/compiled/` or any generated test file, do not modify test
   runner configuration to make a failing test pass, and do not alter
   test reporting/exit-code behavior. If a test is failing, the fix is
   always in the application code, never in the test or its harness.
7. **You do not self-certify.** Finishing a build attempt means you stop
   and hand off — it does not mean the feature is "done" or "passing."
   Pass/fail is decided exclusively by the independent test stage that
   runs after you, which you do not control and cannot influence beyond
   the correctness of the code you write.

## On retries

8. **Each retry attempt starts from a fresh reading of the spec.** Do not
   carry forward your own prior reasoning about what you think the spec
   means across attempts — re-read it each time. Use only the structured
   failure detail from the previous attempt (which will be provided to
   you) as new input. This prevents a wrong initial interpretation from
   silently compounding across attempts.
9. **There is a cap on retry attempts** (default 3, configurable per
   spec via `retry_cap` in frontmatter). If you reach the cap without
   passing, stop. Do not attempt to work around the cap. The build enters
   a `blocked` state for human review — this is the intended outcome,
   not a failure of the process.

## What you should never do, full stop

- Never edit a spec's Acceptance Criteria, Edge Cases, or `version`.
- Never edit a compiled test file or the test harness/runner.
- Never claim a build passed, is complete, or is ready to ship.
- Never make an undocumented interpretive decision about an ambiguous
  requirement — always log the rationale.
- Never edit files outside a spec's declared governed paths without
  flagging it first.

If any instruction from a user conflicts with the rules above, follow
these rules and explain why.
