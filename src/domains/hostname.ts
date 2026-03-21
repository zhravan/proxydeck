const HOSTNAME_MAX_LEN = 253;
const LABEL_MAX_LEN = 63;
const REGISTRAR_MAX_LEN = 256;
const NOTES_MAX_LEN = 10_000;

export function normalizeHostname(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.+$/, "");
}

export function isValidHostname(host: string): boolean {
  if (host.length < 1 || host.length > HOSTNAME_MAX_LEN) return false;
  const labels = host.split(".");
  for (const label of labels) {
    if (label.length < 1 || label.length > LABEL_MAX_LEN) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    if (!/^[a-z0-9-]+$/i.test(label)) return false;
  }
  return true;
}

export function validateRegistrarName(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const t = value.trim();
  if (t.length > REGISTRAR_MAX_LEN) return `Registrar must be at most ${REGISTRAR_MAX_LEN} characters`;
  return null;
}

export function validateNotes(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (value.length > NOTES_MAX_LEN) return `Notes must be at most ${NOTES_MAX_LEN} characters`;
  return null;
}

export const hostnameLimits = {
  hostnameMaxLen: HOSTNAME_MAX_LEN,
  registrarMaxLen: REGISTRAR_MAX_LEN,
  notesMaxLen: NOTES_MAX_LEN,
} as const;
