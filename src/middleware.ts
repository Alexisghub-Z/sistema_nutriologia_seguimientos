import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/agendar']
  publicRoutes.some((route) => pathname === route || pathname.startsWith('/api/auth'))
// Admin routes that require authentication
  const isAdminRoute = pathname.startsWith('/dashboard') ||
                      pathname.startsWith('/citas') ||
                      pathname.startsWith('/pacientes') ||
                      pathname.startsWith('/mensajes') ||
                      pathname.startsWith('/configuracion')

  // Redirect to login if trying to access admin route without auth
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to dashboard if already logged in and trying to access login
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
