import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ownerEmail } from '@/lib/google/oauth';
import { getClient, issueCode, purgeExpired } from '@/lib/oauth/server';
import { SESSION_COOKIE, readSession } from '@/lib/session';

function back(redirectUri: string, params: Record<string, string>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

/**
 * Authorization endpoint. Google still decides who the user is: if there is no
 * session yet the browser is sent through the existing Google login and comes
 * back here, so this app never handles a password.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const scope = url.searchParams.get('scope') ?? 'kanban';

  // Anything wrong with client or redirect must NOT bounce back to an
  // unverified URL, or this becomes an open redirect.
  const client = clientId ? await getClient(clientId) : null;
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
  }
  if (url.searchParams.get('response_type') !== 'code') {
    return back(redirectUri, { error: 'unsupported_response_type', state });
  }

  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);

  if (!session) {
    const login = new URL('/api/auth/google', url.origin);
    login.searchParams.set('next', url.pathname + url.search);
    return NextResponse.redirect(login);
  }
  if (session.email !== ownerEmail()) {
    return back(redirectUri, { error: 'access_denied', state });
  }

  await purgeExpired();
  const code = await issueCode({
    clientId,
    redirectUri,
    scope,
    userEmail: session.email,
    codeChallenge: url.searchParams.get('code_challenge'),
    codeChallengeMethod: url.searchParams.get('code_challenge_method'),
  });

  return back(redirectUri, state ? { code, state } : { code });
}
