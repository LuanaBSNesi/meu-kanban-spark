import { createHash, randomBytes } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { oauthClients, oauthCodes, oauthTokens } from '@/lib/db/schema';

const CODE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const TOKEN_TTL_SECONDS = TOKEN_TTL_MS / 1000;
export const SUPPORTED_SCOPES = ['kanban'];

function secret(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function issuerFor(request: Request) {
  return new URL(request.url).origin;
}

// CLIENTS

export async function registerClient(input: {
  redirectUris: string[];
  clientName?: string;
  isPublic: boolean;
}) {
  const clientId = `mcp_${secret(16)}`;
  const clientSecret = input.isPublic ? null : `sec_${secret(32)}`;

  const [client] = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientSecret,
      clientName: input.clientName ?? '',
      redirectUris: input.redirectUris,
    })
    .returning();

  return client;
}

export async function getClient(clientId: string) {
  const [client] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId));
  return client ?? null;
}

// AUTHORIZATION CODES

export async function issueCode(input: {
  clientId: string;
  redirectUri: string;
  scope: string;
  userEmail: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}) {
  const code = secret(32);
  await db.insert(oauthCodes).values({
    code,
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    scope: input.scope,
    userEmail: input.userEmail,
    codeChallenge: input.codeChallenge ?? null,
    codeChallengeMethod: input.codeChallengeMethod ?? null,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

function verifyPkce(verifier: string | undefined, challenge: string, method: string | null) {
  if (!verifier) return false;
  if (method === 'S256') {
    return createHash('sha256').update(verifier).digest('base64url') === challenge;
  }
  return verifier === challenge;
}

type RedeemResult =
  | { ok: false }
  | { ok: true; userEmail: string; scope: string };

/** Single use: the row is deleted as it is read, so a replay finds nothing. */
export async function redeemCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<RedeemResult> {
  const [row] = await db.delete(oauthCodes).where(eq(oauthCodes.code, input.code)).returning();

  if (!row) return { ok: false };
  if (row.clientId !== input.clientId) return { ok: false };
  if (row.redirectUri !== input.redirectUri) return { ok: false };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false };
  if (
    row.codeChallenge &&
    !verifyPkce(input.codeVerifier, row.codeChallenge, row.codeChallengeMethod)
  ) {
    return { ok: false };
  }

  return { ok: true, userEmail: row.userEmail, scope: row.scope };
}

// TOKENS

export async function issueTokens(input: {
  clientId: string;
  userEmail: string;
  scope: string;
}) {
  const token = secret(32);
  const refreshToken = secret(32);

  await db.insert(oauthTokens).values({
    token,
    refreshToken,
    clientId: input.clientId,
    userEmail: input.userEmail,
    scope: input.scope,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return { token, refreshToken };
}

export async function rotateRefreshToken(refreshToken: string, clientId: string) {
  const [row] = await db
    .delete(oauthTokens)
    .where(and(eq(oauthTokens.refreshToken, refreshToken), eq(oauthTokens.clientId, clientId)))
    .returning();
  if (!row) return null;

  return issueTokens({ clientId: row.clientId, userEmail: row.userEmail, scope: row.scope });
}

export async function resolveToken(token: string) {
  const [row] = await db.select().from(oauthTokens).where(eq(oauthTokens.token, token));
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Housekeeping so expired rows do not accumulate; cheap enough to run inline. */
export async function purgeExpired() {
  const now = new Date();
  await db.delete(oauthCodes).where(lt(oauthCodes.expiresAt, now));
  await db.delete(oauthTokens).where(lt(oauthTokens.expiresAt, now));
}
