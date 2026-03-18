const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:8001'
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || ''
const TRANSCRIPTION_COLLECTOR_URL =
  process.env.TRANSCRIPTION_COLLECTOR_URL || 'http://localhost:8123'

export async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${ADMIN_API_URL}${path}`, {
    ...init,
    headers: {
      'X-Admin-API-Key': ADMIN_API_TOKEN,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Admin API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function collectorFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${TRANSCRIPTION_COLLECTOR_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Collector API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}
