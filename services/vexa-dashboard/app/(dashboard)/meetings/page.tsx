'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MeetingCalendar from '@/components/MeetingCalendar'
import CopyTranscriptButton from '@/components/CopyTranscriptButton'

interface CalendarAttendee {
  email?: string
  displayName?: string
  responseStatus?: string
}

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
  calendar_event_title?: string | null
  calendar_attendees?: CalendarAttendee[] | null
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
  const [showJoinModal, setShowJoinModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setView(getInitialView())
  }, [])

  const fetchMeetings = useCallback(() => {
    fetch('/api/meetings')
      .then((res) => res.json())
      .then((data) => {
        setMeetings(Array.isArray(data) ? data : data.meetings ?? data.items ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

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
      {/* Header with view toggle and Add Bot button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Bot to Meeting
          </button>
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
      </div>

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <JoinMeetingModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false)
            fetchMeetings()
          }}
        />
      )}

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
                  const calAttendees = meeting.calendar_attendees ?? []
                  const transcriptParticipants = meeting.participants ?? []
                  const hasCalendar = calAttendees.length > 0
                  const peopleList = hasCalendar
                    ? calAttendees.map(a => a.displayName || a.email?.split('@')[0] || a.email || 'Unknown')
                    : transcriptParticipants
                  const visibleP = peopleList.slice(0, 3)
                  const overflowP = peopleList.length - 3

                  return (
                    <tr
                      key={meeting.id}
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">
                          {meeting.meeting_name || meeting.calendar_event_title || `Meeting #${meeting.id}`}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 font-mono">#{String(meeting.id)}</span>
                          {meeting.calendar_event_title && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500">
                              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Calendar
                            </span>
                          )}
                        </div>
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
                          {peopleList.length === 0 && <span className="text-gray-400">-</span>}
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

function JoinMeetingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [meetingUrl, setMeetingUrl] = useState('')
  const [botName, setBotName] = useState('')
  const [language, setLanguage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const body: Record<string, string> = { meeting_url: meetingUrl }
      if (botName.trim()) body.bot_name = botName.trim()
      if (language.trim()) body.language = language.trim()

      const res = await fetch('/api/bots/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`)
        return
      }

      setSuccess(true)
      setTimeout(onSuccess, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Bot to Meeting</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
            Bot is joining the meeting!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="meeting-url" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting URL <span className="text-red-500">*</span>
              </label>
              <input
                id="meeting-url"
                type="url"
                required
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">Google Meet, Teams, or Zoom URL</p>
            </div>

            <div>
              <label htmlFor="bot-name" className="block text-sm font-medium text-gray-700 mb-1">
                Bot Name
              </label>
              <input
                id="bot-name"
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Vexa"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="">Auto-detect</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="it">Italian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="he">Hebrew</option>
                <option value="ru">Russian</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !meetingUrl}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Sending...' : 'Add Bot'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
