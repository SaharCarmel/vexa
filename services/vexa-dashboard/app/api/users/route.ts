import { NextRequest, NextResponse } from "next/server"
import { adminFetch } from "@/lib/api-client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const skip = searchParams.get("skip") || "0"
    const limit = searchParams.get("limit") || "50"
    const data = await adminFetch(`/admin/users?skip=${skip}&limit=${limit}`)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    )
  }
}
