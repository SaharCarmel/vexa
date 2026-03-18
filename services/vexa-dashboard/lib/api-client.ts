const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8056'
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || ''

const adminHeaders = {
  'X-Admin-API-Key': ADMIN_API_TOKEN,
  'Content-Type': 'application/json',
}

export async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...adminHeaders, ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Admin API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function collectorFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...adminHeaders, ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Collector API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}
