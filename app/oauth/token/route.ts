import {
  TOKEN_TTL_SECONDS,
  getClient,
  issueTokens,
  redeemCode,
  rotateRefreshToken,
} from '@/lib/oauth/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function fail(error: string, status = 400) {
  return Response.json({ error }, { status, headers: CORS });
}

/** Credentials may arrive in the body or as HTTP Basic, per RFC 6749. */
function credentials(request: Request, form: URLSearchParams) {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    const [id, secret] = Buffer.from(header.slice(6), 'base64').toString().split(':');
    return { clientId: id ?? '', clientSecret: secret ?? null };
  }
  return {
    clientId: form.get('client_id') ?? '',
    clientSecret: form.get('client_secret'),
  };
}

export async function POST(request: Request) {
  try {
    const form = new URLSearchParams(await request.text());
    const { clientId, clientSecret } = credentials(request, form);

    const client = clientId ? await getClient(clientId) : null;
    if (!client) return fail('invalid_client', 401);
    // A confidential client must prove itself; a public one registered without
    // a secret is allowed to omit it, which is what PKCE protects.
    if (client.clientSecret && client.clientSecret !== clientSecret) {
      return fail('invalid_client', 401);
    }

    const grantType = form.get('grant_type');

    if (grantType === 'refresh_token') {
      const refresh = form.get('refresh_token');
      const rotated = refresh ? await rotateRefreshToken(refresh, clientId) : null;
      if (!rotated) return fail('invalid_grant');

      return Response.json(
        {
          access_token: rotated.token,
          refresh_token: rotated.refreshToken,
          token_type: 'Bearer',
          expires_in: TOKEN_TTL_SECONDS,
        },
        { headers: CORS },
      );
    }

    if (grantType !== 'authorization_code') return fail('unsupported_grant_type');

    const redeemed = await redeemCode({
      code: form.get('code') ?? '',
      clientId,
      redirectUri: form.get('redirect_uri') ?? '',
      codeVerifier: form.get('code_verifier') ?? undefined,
    });
    if (!redeemed.ok) return fail('invalid_grant');

    const issued = await issueTokens({
      clientId,
      userEmail: redeemed.userEmail,
      scope: redeemed.scope,
    });

    return Response.json(
      {
        access_token: issued.token,
        refresh_token: issued.refreshToken,
        token_type: 'Bearer',
        expires_in: TOKEN_TTL_SECONDS,
        scope: redeemed.scope,
      },
      { headers: CORS },
    );
  } catch (error) {
    console.error('Falha no endpoint de token', error);
    return fail('invalid_request');
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
