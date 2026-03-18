'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TranscriptViewer from '@/components/TranscriptViewer'

export default function TranscriptPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const [transcript, setTranscript] = useState<{ start_time: number; end_time: number; text: string; speaker: string; language: string }[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/meetings/${meetingId}/transcript`)
      .then((res) => res.json())
      .then((data) => setTranscript(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [meetingId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading transcript...</div>
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
      <div className="mb-4">
        <Link
          href={`/meetings/${meetingId}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Meeting
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Transcript — {meetingId.slice(0, 8)}...
      </h1>

      {!transcript || (Array.isArray(transcript) && transcript.length === 0) ? (
        <div className="rounded bg-gray-50 border border-gray-200 p-8 text-center text-gray-500">
          No transcript available for this meeting.
        </div>
      ) : (
        <TranscriptViewer segments={transcript} />
      )}
    </div>
  )
}
