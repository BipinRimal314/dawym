import type { Session } from '../types'

const STORAGE_KEY = 'dawym-sessions'
const MAX_SESSIONS = 50

export function saveSessions(sessions: Session[]): void {
  // Strip audioBlob before persisting — too large for localStorage
  const serializable = sessions.map(({ audioBlob: _blob, audioUrl: _url, ...rest }) => rest)

  // Keep only the most recent MAX_SESSIONS entries
  const trimmed = serializable.slice(0, MAX_SESSIONS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage full — drop oldest entries and retry
    const reduced = trimmed.slice(0, Math.floor(trimmed.length / 2))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced))
  }
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Session[]
  } catch {
    return []
  }
}

export function deleteSession(id: string): void {
  const sessions = loadSessions()
  const filtered = sessions.filter((s) => s.id !== id)
  saveSessions(filtered)
}
