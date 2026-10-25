import { useEffect, useState } from 'react'
import type { RadarData } from '../api/rainviewer'
import { fmtClock } from '../lib/format'

export interface RadarControlProps {
  enabled: boolean
  radar: RadarData | null
  error: boolean
  frameIndex: number
  onToggle: () => void
  onFrameChange: (index: number) => void
}

/** Radar layer toggle + time slider with play/pause. */
export default function RadarControl({
  enabled,
  radar,
  error,
  frameIndex,
  onToggle,
  onFrameChange,
}: RadarControlProps) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || !radar || !enabled) return
    const id = setInterval(() => {
      onFrameChange((frameIndex + 1) % radar.frames.length)
    }, 600)
    return () => clearInterval(id)
  }, [playing, radar, enabled, frameIndex, onFrameChange])

  const frame = radar?.frames[frameIndex]

  return (
    <div className="pointer-events-auto flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={`self-start rounded-xl border px-3 py-2 text-sm font-medium shadow-lg ${
          enabled
            ? 'border-sky-500 bg-sky-500 text-white'
            : 'border-slate-300 bg-white/95 text-slate-700 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200'
        }`}
      >
        🌧️ Radar
      </button>
      {enabled && (
        <div className="w-64 max-w-[calc(100vw-5.5rem)] rounded-xl border border-slate-300 bg-white/95 p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
          {error && <p className="text-xs text-red-500">Radar not available.</p>}
          {!error && !radar && <p className="text-xs text-slate-500">Loading frames…</p>}
          {radar && frame && (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="h-8 w-8 shrink-0 rounded-lg bg-slate-200 text-sm dark:bg-slate-800"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? '⏸' : '▶️'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={radar.frames.length - 1}
                  step={1}
                  value={frameIndex}
                  onChange={(e) => {
                    setPlaying(false)
                    onFrameChange(Number(e.target.value))
                  }}
                  className="wee-range w-full"
                  aria-label="Radar frame time"
                />
              </div>
              <p className="mt-1 text-center text-xs tabular-nums text-slate-600 dark:text-slate-300">
                {fmtClock(frame.time * 1000)}{' '}
                {frameIndex === radar.nowIndex ? <span className="font-medium">now</span> : 'observed'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
