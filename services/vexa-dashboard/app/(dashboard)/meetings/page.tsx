'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MeetingCalendar from '@/components/MeetingCalendar'
import CopyTranscriptButton from '@/components/CopyTranscriptButton'

interface Meeting {
  id: number | string
  platform: string
  status: string
  user_id?: number | string
  user_email?: string
  meeting_name?: string
  participants?: string[]
  start_time?: string | null
  end_time?: string | null
  [key: string]: unknown
}

type ViewMode = 'calendar' | 'table'

function getInitialView(): ViewMode {
  if (typeof window === 'undefined') return 'calendar'
  return (localStorage.getItem('meetings-view') as ViewMode) || 'calendar'
}

const platformBadge: Record<string, { bg: string; text: string }> = {
  zoom: { bg: 'bg-blue-50', text: 'text-blue-700' },
  google_meet: { bg: 'bg-green-50', text: 'text-green-700' },
  teams: { bg: 'bg-purple-50', text: 'text-purple-700' },
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('calendar')
  const router = useRouter()

  useEffect(() => {
    setView(getInitialView())
  }, [])

  useEffect(() => {
    fetch('/api/meetings')
      .then((res) => res.json())
      .then((data) => {
        setMeetings(Array.isArray(data) ? data : data.meetings ?? data.items ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function toggleView(v: ViewMode) {
    setView(v)
    localStorage.setItem('meetings-view', v)
  }

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
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => toggleView('calendar')}
            aria-pressed={view === 'calendar'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'calendar' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </button>
          <button
            onClick={() => toggleView('table')}
            aria-pressed={view === 'table'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'table' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Table
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && <MeetingCalendar meetings={meetings} />}

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meeting</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {meetings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No meetings found
                  </td>
                </tr>
              ) : (
                meetings.map((meeting, idx) => {
                  const colors = platformBadge[meeting.platform] ?? { bg: 'bg-gray-50', text: 'text-gray-700' }
                  const participants = meeting.participants ?? []
                  const visibleP = participants.slice(0, 3)
                  const overflowP = participants.length - 3

                  return (
                    <tr
                      key={meeting.id}
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">
                          {meeting.meeting_name || `Meeting #${meeting.id}`}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">#{String(meeting.id)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {meeting.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            meeting.status === 'active'
                              ? 'bg-green-50 text-green-700'
                              : meeting.status === 'ended' || meeting.status === 'completed'
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
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-1">
                          {visibleP.map((p, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {p}
                            </span>
                          ))}
                          {overflowP > 0 && (
                            <span className="text-xs text-gray-400">+{overflowP}</span>
                          )}
                          {participants.length === 0 && <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(meeting.start_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(meeting.end_time)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <CopyTranscriptButton meetingId={meeting.id} compact />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
