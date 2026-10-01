/**
 * openIMIS contract states (contract module `Contract.STATE_*`) as emitted by
 * `ContractStateMapping` (developer_api_fhir/mapping/contract.py).
 */
export const CONTRACT_STATES = {
  1: "request-for-information",
  2: "draft",
  3: "offer",
  4: "negotiable",
  5: "executable",
  6: "addendum",
  7: "effective",
  8: "executed",
  9: "disputed",
  10: "terminated",
  11: "counter",
} as const;

export type ContractState = (typeof CONTRACT_STATES)[keyof typeof CONTRACT_STATES];

/** Funnel stages, same grouping as the policy-holder analytics `contract_funnel`. */
export type ContractStateGroup =
  | "draft_like"
  | "offer_negotiation"
  | "executable"
  | "effective"
  | "executed"
  | "closed";

export const CONTRACT_STATE_GROUPS: Record<ContractStateGroup, readonly ContractState[]> = {
  draft_like: ["draft", "request-for-information"],
  offer_negotiation: ["offer", "negotiable", "counter"],
  executable: ["executable", "addendum"],
  effective: ["effective"],
  executed: ["executed"],
  closed: ["terminated", "disputed"],
};

/** `request_for_information`, `Request For Information`, `1` → `request-for-information`. */
export function normalizeContractState(raw: unknown): ContractState | undefined {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return undefined;
  const byCode = (CONTRACT_STATES as Record<string, ContractState>)[text];
  if (byCode) return byCode;
  const hyphenated = text.replace(/[\s_]+/g, "-");
  return (Object.values(CONTRACT_STATES) as string[]).includes(hyphenated)
    ? (hyphenated as ContractState)
    : undefined;
}

export function contractStateGroup(raw: unknown): ContractStateGroup | undefined {
  const state = normalizeContractState(raw);
  if (!state) return undefined;
  return (Object.keys(CONTRACT_STATE_GROUPS) as ContractStateGroup[]).find((group) =>
    CONTRACT_STATE_GROUPS[group].includes(state)
  );
}

/** Portal contract updates are only possible before submission (states 1, 2, 11). */
export function isContractEditable(raw: unknown): boolean {
  const state = normalizeContractState(raw);
  return state === "request-for-information" || state === "draft" || state === "counter";
}

/** Count contracts per funnel group from a `{state: count}` map (e.g. metric `by_state`). */
export function groupContractStateCounts(
  byState: Record<string, number>
): Record<ContractStateGroup, number> {
  const out: Record<ContractStateGroup, number> = {
    draft_like: 0,
    offer_negotiation: 0,
    executable: 0,
    effective: 0,
    executed: 0,
    closed: 0,
  };
  for (const [state, count] of Object.entries(byState)) {
    const group = contractStateGroup(state);
    if (group) out[group] += count;
  }
  return out;
}
