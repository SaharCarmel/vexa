'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Meeting {
  id: number | string
  platform: string
  status: string
  user_id?: number | string
  user_email?: string
  start_time?: string | null
  end_time?: string | null
  [key: string]: unknown
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/meetings')
      .then((res) => res.json())
      .then((data) => {
        setMeetings(Array.isArray(data) ? data : data.meetings ?? data.items ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading meetings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded bg-red-50 border border-red-200 p-4 text-red-700">
        Error: {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Meetings</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No meetings found
                </td>
              </tr>
            ) : (
              meetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">
                    {meeting.id}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {meeting.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        meeting.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : meeting.status === 'ended'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {meeting.user_email || meeting.user_id || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(meeting.start_time)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(meeting.end_time)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
