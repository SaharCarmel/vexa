'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface MeetingDetail {
  id?: string
  meeting_id?: string
  platform?: string
  status?: string
  start_time?: string
  end_time?: string
  duration?: number
  user_id?: string
  user_email?: string
  sessions?: Array<Record<string, unknown>>
  telematics?: Record<string, unknown>
  [key: string]: unknown
}

export default function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/meetings/${meetingId}`)
      .then((res) => res.json())
      .then((data) => setMeeting(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [meetingId])

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading meeting details...</div>
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

  if (!meeting) {
    return (
      <div className="text-gray-500">Meeting not found</div>
    )
  }

  const knownKeys = new Set([
    'id', 'meeting_id', 'platform', 'status', 'start_time', 'end_time',
    'duration', 'user_id', 'user_email', 'sessions', 'telematics',
  ])
  const extraFields = Object.entries(meeting).filter(
    ([key, val]) => !knownKeys.has(key) && val != null
  )

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/meetings"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Meetings
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Meeting {meetingId.slice(0, 8)}...
      </h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Meeting Info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <dt className="text-xs text-gray-500 uppercase">Platform</dt>
            <dd>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                {meeting.platform || '-'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Status</dt>
            <dd>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  meeting.status === 'active'
                    ? 'bg-green-50 text-green-700'
                    : meeting.status === 'ended'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                {meeting.status || '-'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Start Time</dt>
            <dd className="text-sm">{formatDate(meeting.start_time)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">End Time</dt>
            <dd className="text-sm">{formatDate(meeting.end_time)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Duration</dt>
            <dd className="text-sm">{formatDuration(meeting.duration)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">User</dt>
            <dd className="text-sm">{meeting.user_email || meeting.user_id || '-'}</dd>
          </div>
        </dl>
      </div>

      {extraFields.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Telematics</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {extraFields.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-gray-500 uppercase">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-sm">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {meeting.sessions && meeting.sessions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sessions</h2>
          <div className="space-y-3">
            {meeting.sessions.map((session, i) => (
              <div key={i} className="rounded border p-3 text-sm">
                <pre className="whitespace-pre-wrap text-xs text-gray-600">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link
          href={`/meetings/${meetingId}/transcript`}
          className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          View Transcript
        </Link>
      </div>
    </div>
  )
}
