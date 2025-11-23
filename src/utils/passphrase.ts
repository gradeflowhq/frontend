// Centralised helpers for passphrase storage and presence checks

export const buildPassphraseKey = (assessmentId: string) =>
  `submissions_passphrase:${assessmentId}`;

// Treat empty or whitespace-only as “absent”; return null.
// Do not mutate non-empty values (preserve exact passphrase).
export const normalizePresent = (s: string | null): string | null =>
  s && s.trim().length > 0 ? s : null;

export const readPassphrase = (storageKey: string): string | null =>
  normalizePresent(localStorage.getItem(storageKey));

export const writePassphrase = (storageKey: string, passphrase: string) => {
  // Write exactly what user provided
  localStorage.setItem(storageKey, passphrase);
};

export const clearPassphrase = (storageKey: string) => {
  localStorage.removeItem(storageKey);
};