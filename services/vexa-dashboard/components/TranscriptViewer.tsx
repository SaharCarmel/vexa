'use client';

import CopyButton from './CopyButton';

interface Segment {
  start_time: number;
  end_time: number;
  text: string;
  speaker: string;
  language: string;
}

interface TranscriptViewerProps {
  segments: Segment[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TranscriptViewer({ segments }: TranscriptViewerProps) {
  const fullText = segments
    .map((seg) => `[${seg.speaker}] ${seg.text}`)
    .join('\n');

  return (
    <div>
      <div className="mb-4">
        <CopyButton text={fullText} />
      </div>
      <div className="space-y-3">
        {segments.map((seg, i) => (
          <div key={i} className="rounded border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <span className="font-bold text-gray-800">{seg.speaker}</span>
              <span>{formatTime(seg.start_time)} - {formatTime(seg.end_time)}</span>
            </div>
            <p className="text-sm text-gray-700">{seg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
