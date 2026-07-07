/**
 * PII masking helpers for edge function logs.
 * Never log raw emails / phones / user_ids — use these first.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "***";
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at < 1) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}***@${domain}`;
}

export function maskPhone(phone: string | number | null | undefined): string {
  if (phone === null || phone === undefined) return "***";
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

export function maskId(id: string | null | undefined): string {
  if (!id) return "***";
  const s = String(id);
  if (s.length <= 8) return "***";
  return `${s.slice(0, 8)}…`;
}
