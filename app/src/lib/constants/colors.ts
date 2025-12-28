// Canonical user color mapping for Munro HQ family members
// These colors are used for message bubbles, avatars, and accents

export const FAMILY_IDENTITIES = [
  'Balthazar',
  'Olympia', 
  'Casi',
  'Peter',
  'Delphine',
] as const

export type FamilyIdentity = typeof FAMILY_IDENTITIES[number]

export const USER_COLORS: Record<FamilyIdentity, string> = {
  Balthazar: '#004225', // British racing green
  Olympia: '#40E0D0',   // Turquoise
  Casi: '#00008B',      // Dark blue
  Delphine: '#800080',  // Purple
  Peter: '#7B3F00',     // Chocolate brown
}

// Lighter versions for backgrounds
export const USER_COLORS_LIGHT: Record<FamilyIdentity, string> = {
  Balthazar: '#e6f2ed',
  Olympia: '#e6faf8',
  Casi: '#e6e6ff',      // Light blue (for #00008B)
  Delphine: '#f0e6f0',  // Light purple (for #800080)
  Peter: '#f5ebe0',
}

// Get user's color with fallback
export function getUserColor(identity: string | null | undefined): string {
  if (!identity) return '#5c4033' // Default app brown
  return USER_COLORS[identity as FamilyIdentity] || '#5c4033'
}

// Get user's light color for backgrounds
export function getUserColorLight(identity: string | null | undefined): string {
  if (!identity) return '#faf8f5' // Default app cream
  return USER_COLORS_LIGHT[identity as FamilyIdentity] || '#faf8f5'
}

// Get initials for avatar
export function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}
