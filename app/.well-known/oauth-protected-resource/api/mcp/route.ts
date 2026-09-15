import {
  generateProtectedResourceMetadata,
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

/**
 * RFC 9728 builds the metadata URL by inserting the well-known segment between
 * host and resource path, so a client discovering https://host/api/mcp looks
 * here — not at the bare /.well-known/oauth-protected-resource.
 *
 * scopes_supported is what the client copies into its authorization request.
 * Without it Claude built a request with no `scope` at all and Google answered
 * "Missing required parameter: scope".
 */
export function GET(request: Request) {
  const origin = getPublicOrigin(request);

  const metadata = generateProtectedResourceMetadata({
    // This app, not Google. Spark refuses an MCP whose authorization server
    // lives on someone else's domain; Google still authenticates the user,
    // behind our /oauth endpoints.
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
    additionalMetadata: { scopes_supported: ['kanban'] },
  });

  return Response.json(metadata, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
