import { google } from 'googleapis';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { googleAccounts } from '@/lib/db/schema';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file',
];

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} missing in .env`);
  return value;
}

export function ownerEmail() {
  return required('OWNER_EMAIL').toLowerCase();
}

export function oauthClient() {
  return new google.auth.OAuth2(
    required('GOOGLE_CLIENT_ID'),
    required('GOOGLE_CLIENT_SECRET'),
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/google/callback',
  );
}

export function consentUrl(state: string) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token even on a repeat authorisation
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error('Google nao devolveu access_token');

  const email = await emailForAccessToken(tokens.access_token);

  await db
    .insert(googleAccounts)
    .values({
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? '',
    })
    .onConflictDoUpdate({
      target: googleAccounts.email,
      set: {
        accessToken: tokens.access_token,
        // Google only returns a refresh_token on first consent; keep the stored one otherwise.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? '',
      },
    });

  return email;
}

/** Resolves an access token to the Google account that owns it. */
export async function emailForAccessToken(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Token do Google invalido');

  const info = (await response.json()) as { email?: string; email_verified?: boolean };
  if (!info.email) throw new Error('Token do Google sem e-mail');
  return info.email.toLowerCase();
}

/** Stored credentials with the access token refreshed when it is close to expiring. */
export async function authorizedClient(email = ownerEmail()) {
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.email, email));
  if (!account) return null;

  const client = oauthClient();
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.expiresAt?.getTime(),
  });

  const expired = account.expiresAt ? account.expiresAt.getTime() - Date.now() < 60_000 : false;
  if (expired && account.refreshToken) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    await db
      .update(googleAccounts)
      .set({
        accessToken: credentials.access_token!,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      })
      .where(eq(googleAccounts.email, email));
  }

  return client;
}

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export async function connectedAccount() {
  const [account] = await db
    .select({ email: googleAccounts.email, scope: googleAccounts.scope })
    .from(googleAccounts)
    .where(eq(googleAccounts.email, ownerEmail()));
  if (!account) return null;
  // Google's consent screen lets the user tick scopes individually, so a
  // connected account does not imply Drive was granted.
  return { ...account, hasDrive: account.scope.includes(DRIVE_SCOPE) };
}
