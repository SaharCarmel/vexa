import { NextRequest, NextResponse } from 'next/server'
import { adminFetch } from '@/lib/api-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const data = await adminFetch(
      `/admin/analytics/meetings/${params.meetingId}/telematics?include_transcriptions=true`
    )
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meeting' },
      { status: 500 }
    )
  }
}
