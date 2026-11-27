/**
 * Deterministic SHA-256 hashing utilities using the browser Web Crypto API.
 * Used for computing `spec_hash`, `delivery_hash`, and dispute evidence hashes
 * (`challenge_evidence_hash`, `defense_evidence_hash`).
 */

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Web Crypto API (crypto.subtle) is unavailable in this environment.",
    );
  }
  return subtle;
}

/**
 * Normalizes any JSON-serializable value into a canonical string with
 * deterministically sorted object keys and omitted `undefined` fields.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item ?? null)).join(",")}]`;
  }
  if (value instanceof Uint8Array) {
    return JSON.stringify(Array.from(value));
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const serialized = entries.map(
    ([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`,
  );
  return `{${serialized.join(",")}}`;
}

export function bytes32ToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes32(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Expected a 32-byte (64-character) hex string.");
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sha256Bytes(
  input: string | Uint8Array,
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const digest = await subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = await sha256Bytes(input);
  return bytes32ToHex(bytes);
}

export interface HashResult {
  bytes: Uint8Array;
  hex: string;
}

export async function hashCanonicalPayload(
  payload: unknown,
): Promise<HashResult> {
  const bytes = await sha256Bytes(canonicalJson(payload));
  return { bytes, hex: bytes32ToHex(bytes) };
}

export interface SpecCriteriaInput {
  title: string;
  description: string;
  criteria: string | string[];
}

/**
 * Computes deterministic `spec_hash` for `create_bounty`.
 */
export async function hashSpecCriteria(
  spec: SpecCriteriaInput,
): Promise<HashResult> {
  const criteriaNormalized = Array.isArray(spec.criteria)
    ? spec.criteria.map((c) => c.trim()).filter(Boolean)
    : spec.criteria.trim();
  return hashCanonicalPayload({
    title: spec.title.trim(),
    description: spec.description.trim(),
    criteria: criteriaNormalized,
  });
}

export interface DeliveryPayloadInput {
  bountyId: string | number | bigint;
  workUrl: string;
  evidence: string;
}

/**
 * Computes deterministic `delivery_hash` for `submit_work`.
 */
export async function hashDeliveryPayload(
  delivery: DeliveryPayloadInput,
): Promise<HashResult> {
  return hashCanonicalPayload({
    bountyId: String(delivery.bountyId),
    workUrl: delivery.workUrl.trim(),
    evidence: delivery.evidence.trim(),
  });
}

export interface DisputeEvidenceInput {
  bountyId: string | number | bigint;
  side: "challenger" | "respondent";
  summary: string;
  links?: string[];
}

/**
 * Computes deterministic `challenge_evidence_hash` or `defense_evidence_hash`
 * for `challenge_bounty` / `submit_defense`.
 */
export async function hashDisputeEvidence(
  evidence: DisputeEvidenceInput,
): Promise<HashResult> {
  return hashCanonicalPayload({
    bountyId: String(evidence.bountyId),
    side: evidence.side,
    summary: evidence.summary.trim(),
    links: evidence.links?.map((l) => l.trim()).filter(Boolean) ?? [],
  });
}
