import { SUPPORTED_SCOPES, issuerFor } from '@/lib/oauth/server';

const CORS = { 'Access-Control-Allow-Origin': '*' };

/** RFC 8414 metadata. The issuer is this app, which is what Spark requires. */
export function GET(request: Request) {
  const issuer = issuerFor(request);

  return Response.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      scopes_supported: SUPPORTED_SCOPES,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    },
    { headers: CORS },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
