import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';

/**
 * RFC 9728 builds the metadata URL by inserting the well-known segment between
 * host and resource path, so a client discovering https://host/api/mcp looks
 * here — not at the bare /.well-known/oauth-protected-resource.
 */
export const GET = protectedResourceHandler({
  authServerUrls: ['https://accounts.google.com'],
});

export const OPTIONS = metadataCorsOptionsRequestHandler();
