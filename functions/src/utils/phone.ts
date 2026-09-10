export function normalizePhoneNumber(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const startsWithPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (startsWithPlus) {
    return digits.length >= 7 && digits.length <= 15 ? `+${digits}` : null;
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  if (digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
