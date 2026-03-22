import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8056'
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const res = await fetch(`${GATEWAY_URL}/admin/bots/join`, {
      method: 'POST',
      headers: {
        'X-Admin-API-Key': ADMIN_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || `Failed to join meeting: ${res.status}` },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add bot to meeting' },
      { status: 500 }
    )
  }
}
