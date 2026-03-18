import { NextRequest, NextResponse } from 'next/server'
import { collectorFetch } from '@/lib/api-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const data = await collectorFetch(`/internal/transcripts/${params.meetingId}`)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}
