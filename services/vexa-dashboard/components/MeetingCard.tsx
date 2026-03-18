'use client'

import { useRouter } from 'next/navigation'
import CopyTranscriptButton from './CopyTranscriptButton'

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
}

const platformColors: Record<string, { border: string; bg: string; text: string }> = {
  zoom: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  google_meet: { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  teams: { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
}

const responseStatusIcon: Record<string, string> = {
  accepted: 'text-green-500',
  declined: 'text-red-400',
  tentative: 'text-yellow-500',
  needsAction: 'text-gray-400',
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return null
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

function attendeeLabel(a: CalendarAttendee): string {
  return a.displayName || a.email?.split('@')[0] || a.email || 'Unknown'
}

export default function MeetingCard({ meeting }: { meeting: Meeting }) {
  const router = useRouter()
  const colors = platformColors[meeting.platform] ?? platformColors.zoom
  const title = meeting.meeting_name || meeting.calendar_event_title || `Meeting #${meeting.id}`
  const timeStart = formatTime(meeting.start_time)
  const timeEnd = formatTime(meeting.end_time)
  const duration = getDuration(meeting.start_time, meeting.end_time)

  // Merge participants: prefer calendar attendees (richer data), fall back to transcription participants
  const calAttendees = meeting.calendar_attendees ?? []
  const transcriptParticipants = meeting.participants ?? []
  const hasCalendarData = calAttendees.length > 0

  return (
    <div
      onClick={() => router.push(`/meetings/${meeting.id}`)}
      className={`border-l-4 ${colors.border} bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 min-h-[44px]`}
    >
      {/* Identity */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
              {meeting.platform}
            </span>
            {meeting.calendar_event_title && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </span>
            )}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <CopyTranscriptButton meetingId={meeting.id} compact />
        </div>
      </div>

      {/* Temporal */}
      {(timeStart || duration) && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : timeStart}
          {duration && <span className="text-gray-400">({duration})</span>}
        </div>
      )}

      {/* Participants - Calendar attendees (preferred) */}
      {hasCalendarData && (
        <div className="mt-2">
          <div className="flex items-center gap-1 mb-1">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-400">{calAttendees.length} attendee{calAttendees.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {calAttendees.slice(0, 4).map((a, i) => (
              <span
                key={i}
                title={`${a.email || ''}${a.responseStatus ? ` (${a.responseStatus})` : ''}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${responseStatusIcon[a.responseStatus || ''] ? responseStatusIcon[a.responseStatus!].replace('text-', 'bg-') : 'bg-gray-400'}`} />
                {attendeeLabel(a)}
              </span>
            ))}
            {calAttendees.length > 4 && (
              <span className="text-xs text-gray-400">+{calAttendees.length - 4} more</span>
            )}
          </div>
        </div>
      )}

      {/* Fallback: Transcript-extracted participants */}
      {!hasCalendarData && transcriptParticipants.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {transcriptParticipants.slice(0, 3).map((p, i) => (
              <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {p}
              </span>
            ))}
            {transcriptParticipants.length > 3 && (
              <span className="text-xs text-gray-400">+{transcriptParticipants.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* User email */}
      {meeting.user_email && (
        <div className="mt-2 text-xs text-gray-400 truncate">{meeting.user_email}</div>
      )}
    </div>
  )
}
