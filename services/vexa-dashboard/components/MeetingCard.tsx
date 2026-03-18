'use client'

import { useRouter } from 'next/navigation'
import CopyTranscriptButton from './CopyTranscriptButton'

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
}

const platformColors: Record<string, { border: string; bg: string; text: string }> = {
  zoom: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  google_meet: { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  teams: { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
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

export default function MeetingCard({ meeting }: { meeting: Meeting }) {
  const router = useRouter()
  const colors = platformColors[meeting.platform] ?? platformColors.zoom
  const title = meeting.meeting_name || `Meeting #${meeting.id}`
  const timeStart = formatTime(meeting.start_time)
  const timeEnd = formatTime(meeting.end_time)
  const duration = getDuration(meeting.start_time, meeting.end_time)
  const participants = meeting.participants ?? []
  const visibleParticipants = participants.slice(0, 3)
  const overflowCount = participants.length - 3

  return (
    <div
      onClick={() => router.push(`/meetings/${meeting.id}`)}
      className={`border-l-4 ${colors.border} bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 min-h-[44px]`}
    >
      {/* Identity */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} mt-1`}>
            {meeting.platform}
          </span>
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

      {/* People */}
      {visibleParticipants.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {visibleParticipants.map((p, i) => (
            <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {p}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="text-xs text-gray-400">+{overflowCount} more</span>
          )}
        </div>
      )}

      {/* User email */}
      {meeting.user_email && (
        <div className="mt-2 text-xs text-gray-400 truncate">{meeting.user_email}</div>
      )}
    </div>
  )
}
