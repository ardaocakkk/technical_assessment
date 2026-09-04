const CLIENT_ID_KEY = 'calculator_client_id';

/**
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost). Served over
 * plain HTTP from any other host it is `undefined`, so fall back to a Math.random-based
 * v4-shaped id. Uniqueness is best-effort: the client id is a convenience scoping key,
 * not a security boundary.
 */
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * `localStorage` can throw on access (Safari private browsing, blocked site data), so both
 * the read and the write are guarded. If storage is unavailable we still return a usable
 * id — the caller gets a fresh one per page load instead of a stable one, which degrades
 * history scoping but never breaks calculating.
 */
export function getClientId(): string {
  try {
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
      return stored;
    }
  } catch {
    return generateUuid();
  }

  const clientId = generateUuid();
  try {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  } catch {
    // Storage unavailable — return the generated id without persisting it.
  }
  return clientId;
}
