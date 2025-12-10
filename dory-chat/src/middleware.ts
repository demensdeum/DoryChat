import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check if the session cookie exists
    let sessionId = request.cookies.get('dory_session')?.value;
    let isNewSession = false;

    if (!sessionId) {
        // Generate a new UUID for the session
        // crypto.randomUUID() is supported in Edge Runtime
        sessionId = crypto.randomUUID();
        isNewSession = true;
    }

    // Clone headers and add the session ID so Server Components can access it immediately
    // This is crucial for the very first request where the cookie is not yet in the request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-dory-session', sessionId);

    // Create the response with the modified request headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // If it was a new session, set the secure cookie on the response for future requests
    if (isNewSession) {
        response.cookies.set({
            name: 'dory_session',
            value: sessionId,
            httpOnly: true, // Not accessible via client-side JavaScript
            secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
            sameSite: 'strict', // CSRF protection
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
