import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Custom middleware that handles both NextAuth (dashboard) and Master Auth (master routes)
export default withAuth(
  function middleware(req: NextRequest & { nextauth?: { token?: any } }) {
    const path = req.nextUrl.pathname
    const token = req.nextauth?.token

    // CRITICAL: Skip NextAuth for master routes - they use their own auth
    if (path.startsWith('/master') || path.startsWith('/api/master')) {
      return NextResponse.next()
    }

    // For dashboard routes, require NextAuth token
    if (path.startsWith('/dashboard')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // For dashboard API routes, require NextAuth token
    if (path.startsWith('/api/dashboard')) {
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Redirect old API routes to dashboard (for backward compatibility)
    if (path.startsWith('/api/menu') || 
        path.startsWith('/api/orders') || 
        path.startsWith('/api/tables') ||
        path.startsWith('/api/tax') ||
        path.startsWith('/api/station') ||
        path.startsWith('/api/printer') ||
        path.startsWith('/api/prep-zone') ||
        path.startsWith('/api/events') ||
        path.startsWith('/api/modifiers') ||
        path.startsWith('/api/reports') ||
        path.startsWith('/api/settings') ||
        (path.startsWith('/api/users') && !path.startsWith('/api/master/users'))) {
      const newPath = path.replace('/api/', '/api/dashboard/')
      return NextResponse.redirect(new URL(newPath + req.nextUrl.search, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Always allow master routes - they have their own auth
        if (path.startsWith('/master') || path.startsWith('/api/master')) {
          return true
        }

        // For dashboard routes, require token
        if (path.startsWith('/dashboard') || path.startsWith('/api/dashboard')) {
          return !!token
        }

        // For legacy API routes (redirecting), allow
        if (path.startsWith('/api/menu') || 
            path.startsWith('/api/orders') || 
            path.startsWith('/api/tables') ||
            path.startsWith('/api/tax') ||
            path.startsWith('/api/station') ||
            path.startsWith('/api/printer') ||
            path.startsWith('/api/prep-zone') ||
            path.startsWith('/api/events') ||
            path.startsWith('/api/modifiers') ||
            path.startsWith('/api/reports') ||
            path.startsWith('/api/settings') ||
            (path.startsWith('/api/users') && !path.startsWith('/api/master/users'))) {
          return true
        }

        // For other routes, allow
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/dashboard/:path*',
    '/api/master/:path*',
    '/master/:path*',
    // Legacy API routes (for redirect)
    '/api/menu/:path*',
    '/api/orders/:path*',
    '/api/tables/:path*',
    '/api/tax/:path*',
    '/api/station/:path*',
    '/api/printer/:path*',
    '/api/prep-zone/:path*',
    '/api/events/:path*',
    '/api/modifiers/:path*',
    '/api/reports/:path*',
    '/api/settings/:path*',
    '/api/users/:path*',
  ],
}
