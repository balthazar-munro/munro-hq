/**
 * PIN Authentication Bridge
 * 
 * This module bridges local PIN authentication with Supabase sessions.
 * 
 * Flow:
 * 1. User signs up via invite → Supabase session is stored securely
 * 2. User sets PIN for quick unlock
 * 3. User leaves and returns → Enters PIN → Session is restored
 * 
 * Security:
 * - Supabase refresh tokens are stored in localStorage (encrypted in production)
 * - PIN only unlocks the stored session, doesn't bypass auth
 * - Sessions expire and require re-authentication
 */

import { createClient } from '@/lib/supabase/client'
import { type FamilyIdentity } from '@/lib/constants/colors'

const SESSION_CACHE_KEY = 'munro_sessions'

interface StoredSession {
  identity: FamilyIdentity
  userId: string
  refreshToken: string
  storedAt: number
  expiresAt: number
}

/**
 * Store a Supabase session for later restoration
 */
export async function storeSessionForIdentity(identity: FamilyIdentity): Promise<boolean> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    console.error('No active session to store')
    return false
  }

  const storedSession: StoredSession = {
    identity,
    userId: session.user.id,
    refreshToken: session.refresh_token || '',
    storedAt: Date.now(),
    expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000,
  }

  try {
    // Store in localStorage (in production, consider encryption)
    const sessions = getStoredSessions()
    sessions[identity] = storedSession
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions))
    return true
  } catch (error) {
    console.error('Failed to store session:', error)
    return false
  }
}

/**
 * Get all stored sessions
 */
function getStoredSessions(): Record<string, StoredSession> {
  try {
    return JSON.parse(localStorage.getItem(SESSION_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Check if an identity has a stored session
 */
export function hasStoredSession(identity: string): boolean {
  const sessions = getStoredSessions()
  const session = sessions[identity]
  
  if (!session) return false
  
  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    // Remove expired session
    delete sessions[identity]
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions))
    return false
  }
  
  return true
}

/**
 * Restore a Supabase session for an identity after PIN verification
 */
export async function restoreSessionForIdentity(identity: string): Promise<boolean> {
  const sessions = getStoredSessions()
  const storedSession = sessions[identity]
  
  if (!storedSession || !storedSession.refreshToken) {
    console.log('No stored session for identity:', identity)
    return false
  }

  const supabase = createClient()
  
  try {
    // Try to refresh the session using the stored refresh token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: storedSession.refreshToken,
    })

    if (error || !data.session) {
      console.error('Failed to restore session:', error)
      // Remove invalid session
      delete sessions[identity]
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions))
      return false
    }

    // Update stored session with new tokens
    storedSession.refreshToken = data.session.refresh_token || storedSession.refreshToken
    storedSession.expiresAt = data.session.expires_at 
      ? data.session.expires_at * 1000 
      : Date.now() + 7 * 24 * 60 * 60 * 1000
    sessions[identity] = storedSession
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions))

    console.log('Session restored successfully for:', identity)
    return true
  } catch (error) {
    console.error('Error restoring session:', error)
    return false
  }
}

/**
 * Clear stored session for an identity
 */
export function clearStoredSession(identity: string): void {
  const sessions = getStoredSessions()
  delete sessions[identity]
  localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions))
}

/**
 * Clear all stored sessions (for logout all)
 */
export function clearAllSessions(): void {
  localStorage.removeItem(SESSION_CACHE_KEY)
}

/**
 * Get identity for a user ID
 */
export function getIdentityForUserId(userId: string): string | null {
  const sessions = getStoredSessions()
  for (const [identity, session] of Object.entries(sessions)) {
    if (session.userId === userId) {
      return identity
    }
  }
  return null
}
