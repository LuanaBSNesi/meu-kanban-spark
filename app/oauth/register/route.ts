import { z } from 'zod';
import { registerClient } from '@/lib/oauth/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const schema = z.object({
  redirect_uris: z.array(z.url()).min(1),
  client_name: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
});

/** RFC 7591 dynamic client registration, so a client can onboard itself. */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const isPublic = body.token_endpoint_auth_method === 'none';

    const client = await registerClient({
      redirectUris: body.redirect_uris,
      clientName: body.client_name,
      isPublic,
    });

    return Response.json(
      {
        client_id: client.clientId,
        ...(client.clientSecret ? { client_secret: client.clientSecret } : {}),
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: isPublic ? 'none' : 'client_secret_post',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      },
      { status: 201, headers: CORS },
    );
  } catch (error) {
    console.error('Falha no registro de cliente', error);
    return Response.json(
      { error: 'invalid_client_metadata' },
      { status: 400, headers: CORS },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
