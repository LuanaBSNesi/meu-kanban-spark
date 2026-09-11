/**
 * Signed session cookie. Uses Web Crypto rather than node:crypto because
 * proxy.ts runs on the edge runtime, where node:crypto is unavailable.
 */
const COOKIE = 'kanban_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET missing in .env');
  return value;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Buffer.from(new Uint8Array(mac)).toString('base64url');
}

export async function createSession(email: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${email}:${expiresAt}`;
  return `${Buffer.from(payload).toString('base64url')}.${await sign(payload)}`;
}

export async function readSession(token: string | undefined) {
  if (!token) return null;

  const [encoded, mac] = token.split('.');
  if (!encoded || !mac) return null;

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString();
  } catch {
    return null;
  }

  const expected = await sign(payload);
  // Length-safe comparison; both values are fixed-size base64url MACs.
  if (mac.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  const separator = payload.lastIndexOf(':');
  const email = payload.slice(0, separator);
  const expiresAt = Number(payload.slice(separator + 1));
  if (!email || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { email };
}
