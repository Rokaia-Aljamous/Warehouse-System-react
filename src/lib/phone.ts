export const E164_PHONE_RE = /^\+[1-9][0-9]{6,14}$/;
export const INTERNATIONAL_PREFIX_PHONE_RE = /^00[1-9][0-9]{6,14}$/;
export const LOCAL_PHONE_RE = /^09[0-9]{8}$/;

export function normalizePhoneNumber(value: string): { valid: boolean; normalized: string } {
  const raw = value.trim().replace(/[\s-]+/g, "");

  if (E164_PHONE_RE.test(raw)) {
    return { valid: true, normalized: raw };
  }

  if (INTERNATIONAL_PREFIX_PHONE_RE.test(raw)) {
    return { valid: true, normalized: `+${raw.slice(2)}` };
  }

  if (LOCAL_PHONE_RE.test(raw)) {
    return { valid: true, normalized: `+963${raw.slice(1)}` };
  }

  return { valid: false, normalized: raw };
}
