import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCode, ownerEmail, redirectUriFor } from '@/lib/google/oauth';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from '@/lib/session';

function back(request: Request, params: Record<string, string>) {
  const url = new URL('/', request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const jar = await cookies();
  const expectedState = jar.get('google_oauth_state')?.value;
  jar.delete('google_oauth_state');

  if (url.searchParams.get('error')) {
    return back(request, { google: 'negado' });
  }
  // Guards against a forged callback being used to attach someone else's account.
  if (!code || !state || state !== expectedState) {
    return back(request, { google: 'estado_invalido' });
  }

  try {
    const email = await exchangeCode(code, redirectUriFor(request));
    if (email !== ownerEmail()) {
      return back(request, { google: 'conta_nao_autorizada' });
    }

    jar.set(SESSION_COOKIE, await createSession(email), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
    });

    const next = jar.get('google_oauth_next')?.value;
    jar.delete('google_oauth_next');
    if (next?.startsWith('/') && !next.startsWith('//')) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return back(request, { google: 'conectado' });
  } catch (error) {
    console.error('Falha no callback do Google', error);
    return back(request, { google: 'falhou' });
  }
}
