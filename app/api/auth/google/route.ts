import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { consentUrl, redirectUriFor } from '@/lib/google/oauth';

export async function GET(request: Request) {
  try {
    const state = randomBytes(16).toString('hex');
    const jar = await cookies();
    jar.set('google_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
      secure: process.env.NODE_ENV === 'production',
    });
    return NextResponse.redirect(consentUrl(state, redirectUriFor(request)));
  } catch (error) {
    return apiError(error);
  }
}
