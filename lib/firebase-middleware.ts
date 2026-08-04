import { NextResponse, type NextRequest } from 'next/server'

const MOCK_SESSION_COOKIE = "mockSession";

export async function updateSession(request: NextRequest) {
  const firebaseToken   = request.cookies.get("firebaseToken")?.value;
  const mockSession     = request.cookies.get(MOCK_SESSION_COOKIE)?.value;
  const bypassAuth      = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  const isDashboard = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/settings');

  const isApiProtected =
    request.nextUrl.pathname.startsWith('/api/devis') ||
    request.nextUrl.pathname.startsWith('/api/chat');

  const isAuthenticated = firebaseToken || mockSession || bypassAuth;

  // Redirect unauthenticated users to login
  if (!isAuthenticated && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Block unauthenticated API access
  if (!isAuthenticated && isApiProtected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}
