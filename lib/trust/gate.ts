import type { GateInput, GateOutcome } from "./types";

/**
 * Release gate (§7). Soft-stops only — except the hard-stop for zero
 * testable criteria / foundational failure. Auto-ship when clean.
 */
export const evaluateReleaseGate = (input: GateInput): GateOutcome => {
  const reasons: string[] = [];

  if (input.trust.hardStop || input.trust.combined == null) {
    reasons.push(
      "Hard stop: foundational completeness failed or nothing testable."
    );
    return { decision: "hard_stop", reasons, wouldAutoShip: false };
  }

  if (input.trust.combined < input.releaseThreshold) {
    reasons.push(
      `Combined score ${input.trust.combined} is below release threshold ${input.releaseThreshold}.`
    );
  }

  if (input.verificationStatus === "partial") {
    reasons.push(
      "Verification status is partial — finish checking before treating the score as final."
    );
  }

  if (input.unresolvedSwarmFlags > 0) {
    reasons.push(
      `${input.unresolvedSwarmFlags} unresolved swarm flag(s) (ambiguous / contract-mismatch).`
    );
  }

  if (input.unresolvedDriftFlags > 0) {
    reasons.push(
      `${input.unresolvedDriftFlags} unresolved drift flag(s).`
    );
  }

  if (reasons.length === 0) {
    return {
      decision: "auto_ship",
      reasons: [
        `Clean gate: combined ${input.trust.combined} ≥ ${input.releaseThreshold}, verification complete, no swarm/drift flags.`,
      ],
      wouldAutoShip: true,
    };
  }

  return { decision: "soft_stop", reasons, wouldAutoShip: false };
};
