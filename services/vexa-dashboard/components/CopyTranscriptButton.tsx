'use client'

import { useState } from 'react'

interface CopyTranscriptButtonProps {
  meetingId: number | string
  compact?: boolean
}

type ButtonState = 'idle' | 'loading' | 'copied' | 'error'

export default function CopyTranscriptButton({ meetingId, compact = false }: CopyTranscriptButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    if (state === 'loading' || state === 'copied') return

    setState('loading')
    try {
      const res = await fetch(`/api/meetings/${meetingId}/transcript`)
      if (!res.ok) {
        setState('error')
        setTimeout(() => setState('idle'), 2000)
        return
      }
      const data = await res.json()
      const entries = Array.isArray(data) ? data : data.transcriptions ?? data.entries ?? []
      if (entries.length === 0) {
        setState('error')
        setTimeout(() => setState('idle'), 2000)
        return
      }
      const text = entries
        .map((t: { speaker?: string; text?: string; content?: string }) =>
          `[${t.speaker || 'Unknown'}] ${t.text || t.content || ''}`
        )
        .join('\n')
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  const icons: Record<ButtonState, JSX.Element> = {
    idle: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    loading: (
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
    copied: (
      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  }

  const labels: Record<ButtonState, string> = {
    idle: 'Copy Transcript',
    loading: 'Copying...',
    copied: 'Copied!',
    error: 'No transcript',
  }

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        title={labels[state]}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
      >
        {icons[state]}
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
    >
      {icons[state]}
      {labels[state]}
    </button>
  )
}
