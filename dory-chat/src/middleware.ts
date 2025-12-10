import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check if the session cookie exists
    const sessionCookie = request.cookies.get('dory_session')

    if (!sessionCookie) {
        // Generate a new UUID for the session
        // crypto.randomUUID() is supported in Edge Runtime
        const sessionId = crypto.randomUUID()

        // Create the response
        const response = NextResponse.next()

        // Set the secure cookie
        response.cookies.set({
            name: 'dory_session',
            value: sessionId,
            httpOnly: true, // Not accessible via client-side JavaScript
            secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
            sameSite: 'strict', // CSRF protection
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        return response
    }

    return NextResponse.next()
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
}
