import { auth } from './auth'
import { redirect } from 'next/navigation'

/**
 * Get current session on server components
 * Usage: const session = await getCurrentSession()
 */
export async function getCurrentSession() {
  return await auth()
}

/**
 * Get current user or redirect to login (for Server Components)
 * Usage: const user = await requireAuth()
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return session.user
}

/**
 * Get current user for API Routes (doesn't redirect, just returns null)
 * Usage: const user = await getAuthUser()
 */
export async function getAuthUser() {
  const session = await auth()
  return session?.user || null
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  const session = await auth()
  return session?.user?.rol === 'ADMIN'
}

/**
 * Require admin role or redirect
 */
export async function requireAdmin() {
  const session = await auth()

  if (!session?.user || session.user.rol !== 'ADMIN') {
    redirect('/login')
  }

  return session.user
}
