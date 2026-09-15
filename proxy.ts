import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readSession } from '@/lib/session';

/**
 * Everything is private except the login flow and the MCP endpoint, which
 * carries its own Google bearer authentication for Spark and Claude.
 */
// /oauth/* is listed here because those routes do their own checking:
// /oauth/authorize reads the session itself and sends the browser through
// Google when there is none, which the generic /login redirect would break by
// losing the return path.
const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/api/mcp', '/.well-known/', '/oauth/'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('from', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
