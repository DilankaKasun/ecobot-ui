/**
 * Dashboard sign-in credentials.
 *
 * Add entries to this array to grant more people access:
 *
 *   { username: 'tharindu', password: 'somepassword', label: 'Tharindu' }
 *
 * `label` is optional and only affects what the header greets you as; it
 * falls back to the username.
 *
 * Note this list ships to the browser inside the JS bundle, so treat it as a
 * gate on the UI rather than a secret. Anything that must not be guessable
 * belongs behind a server-side check.
 */
export interface Credential {
  username: string;
  password: string;
  label?: string;
}

export const CREDENTIALS: Credential[] = [
  { username: 'admin', password: 'ecobot@UOR', label: 'Administrator' },
];

/** Returns the matching credential, or null when nothing matches. */
export function verifyCredentials(
  username: string,
  password: string
): Credential | null {
  const user = username.trim();
  return (
    CREDENTIALS.find((c) => c.username === user && c.password === password) ??
    null
  );
}
