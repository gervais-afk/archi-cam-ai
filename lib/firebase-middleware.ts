import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const firebaseToken = request.cookies.get("firebaseToken")?.value;

  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/settings');

  // Allow dashboard access without auth only if BYPASS_AUTH is explicitly set
  // Otherwise, enforce auth on protected routes
  if (!firebaseToken && !bypassAuth && isDashboard &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/register')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Allow API routes to be accessed, they will verify auth themselves
  // Alternatively, basic check for api/devis
  if (!firebaseToken && !bypassAuth && request.nextUrl.pathname.startsWith('/api/devis')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}
