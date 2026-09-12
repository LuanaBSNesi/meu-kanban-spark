import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';

/**
 * RFC 9728 discovery document. The 401 from /api/mcp points clients here so
 * they can find out which authorization server to use — Google, in our case.
 */
export const GET = protectedResourceHandler({
  authServerUrls: ['https://accounts.google.com'],
});

export const OPTIONS = metadataCorsOptionsRequestHandler();
