'use client'

import { useState, useMemo } from 'react'
import MeetingCard from './MeetingCard'

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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const platformDotColor: Record<string, string> = {
  zoom: 'bg-blue-500',
  google_meet: 'bg-green-500',
  teams: 'bg-purple-500',
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function MeetingCalendar({ meetings }: { meetings: Meeting[] }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {}
    for (const m of meetings) {
      if (!m.start_time) continue
      const d = new Date(m.start_time)
      const key = dateKey(d)
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return map
  }, [meetings])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const totalDays = lastDay.getDate()

  // Build calendar grid
  const days: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d))
  // Fill remaining cells to complete the grid
  while (days.length % 7 !== 0) days.push(null)

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  function goToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
  }

  const selectedKey = selectedDate ? dateKey(selectedDate) : null
  const selectedMeetings = selectedKey ? (meetingsByDate[selectedKey] ?? []) : []

  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Today
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={`px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 ${i === 0 || i === 6 ? 'bg-gray-50' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) {
              const isWeekend = i % 7 === 0 || i % 7 === 6
              return <div key={`empty-${i}`} className={`h-20 border-b border-r border-gray-100 ${isWeekend ? 'bg-gray-50/50' : ''}`} />
            }

            const key = dateKey(day)
            const dayMeetings = meetingsByDate[key] ?? []
            const isToday = isSameDay(day, today)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const dots = dayMeetings.slice(0, 3)
            const overflow = dayMeetings.length - 3

            return (
              <div
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`h-20 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors
                  ${isWeekend ? 'bg-gray-50/50' : ''}
                  ${isToday ? 'bg-blue-50/60' : ''}
                  ${isSelected ? 'ring-2 ring-inset ring-blue-500' : ''}
                  hover:bg-gray-50
                `}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day.getDate()}
                </div>
                {dots.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dots.map((m, j) => (
                      <span
                        key={j}
                        className={`h-2 w-2 rounded-full ${platformDotColor[m.platform] ?? 'bg-gray-400'}`}
                      />
                    ))}
                    {overflow > 0 && (
                      <span className="text-[10px] leading-none text-gray-400 ml-0.5">+{overflow}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Platform legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Zoom</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Google Meet</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Teams</span>
      </div>

      {/* Selected day meetings */}
      <div className="mt-6">
        {selectedDate && (
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
            <span className="ml-2 text-gray-400">({selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''})</span>
          </h3>
        )}
        {selectedMeetings.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        ) : selectedDate ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No meetings on this day
          </div>
        ) : null}
      </div>
    </div>
  )
}
