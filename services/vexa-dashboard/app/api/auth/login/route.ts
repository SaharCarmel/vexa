import { NextResponse } from "next/server"
import { signToken } from "@/lib/auth"

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Admin password not configured" },
      { status: 500 }
    )
  }

  const { username, password } = await request.json()
  const adminUsername = process.env.ADMIN_USERNAME || "admin"

  if (username === adminUsername && password === adminPassword) {
    const token = await signToken({ username })
    const response = NextResponse.json({ success: true })
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })
    return response
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
}
