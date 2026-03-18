"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface User {
  id: string
  email: string
  name: string | null
  created_at: string
  max_bots_allowed: number
}

interface Analytics {
  meeting_count?: number
  total_duration?: number
  usage_patterns?: Record<string, unknown>
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    Promise.all([
      fetch(`/api/users/${userId}`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user")
        return res.json()
      }),
      fetch(`/api/users/${userId}/analytics`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([userData, analyticsData]) => {
        setUser(userData)
        setAnalytics(analyticsData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading user details...</div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        Error: {error ?? "User not found"}
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/users"
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        &larr; Back to Users
      </Link>

      <h1 className="text-2xl font-bold mb-6">{user.name ?? user.email}</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">User Info</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(user.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Max Bots Allowed
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user.max_bots_allowed}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">User ID</dt>
            <dd className="mt-1 text-sm font-mono text-gray-600">{user.id}</dd>
          </div>
        </dl>
      </div>

      {analytics && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Analytics</h2>
          <dl className="grid grid-cols-3 gap-4">
            {analytics.meeting_count != null && (
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm font-medium text-gray-500">
                  Meetings
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {analytics.meeting_count}
                </dd>
              </div>
            )}
            {analytics.total_duration != null && (
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm font-medium text-gray-500">
                  Total Duration
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {Math.round(analytics.total_duration / 60)} min
                </dd>
              </div>
            )}
            {analytics.usage_patterns && (
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm font-medium text-gray-500">
                  Usage Patterns
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(analytics.usage_patterns, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
