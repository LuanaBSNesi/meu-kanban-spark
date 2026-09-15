import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { consentUrl, redirectUriFor } from '@/lib/google/oauth';

export async function GET(request: Request) {
  try {
    const state = randomBytes(16).toString('hex');
    const jar = await cookies();
    const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 600,
      secure: process.env.NODE_ENV === 'production',
    };

    jar.set('google_oauth_state', state, options);

    // Where to land after login. Only same-site paths, so this cannot be turned
    // into a redirect to someone else's site.
    const next = new URL(request.url).searchParams.get('next');
    if (next?.startsWith('/') && !next.startsWith('//')) {
      jar.set('google_oauth_next', next, options);
    }

    return NextResponse.redirect(consentUrl(state, redirectUriFor(request)));
  } catch (error) {
    return apiError(error);
  }
}
