import { NextRequest, NextResponse } from "next/server"
import { adminFetch } from "@/lib/api-client"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const data = await adminFetch(`/admin/analytics/users/${userId}/details`)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user analytics" },
      { status: 500 }
    )
  }
}
