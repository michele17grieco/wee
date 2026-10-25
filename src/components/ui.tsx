import type { ReactNode } from 'react'
import { CONFIDENCE_COLORS, CONFIDENCE_LABELS, confidenceLevel } from '../lib/confidence'
import { fmtDelta, fmtMeters } from '../lib/format'

/** Coloured dot for the confidence index (green/yellow/red). */
export function ConfidenceDot({ score, showValue = false }: { score: number; showValue?: boolean }) {
  const level = confidenceLevel(score)
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`${CONFIDENCE_LABELS[level]} — ${score}% agreement`}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: CONFIDENCE_COLORS[level] }}
      />
      {showValue && <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{score}%</span>}
      <span className="sr-only">{CONFIDENCE_LABELS[level]}</span>
    </span>
  )
}

/** Badge that explains the elevation correction. */
export function ElevationBadge({ real, model, fallback = false }: { real: number; model: number; fallback?: boolean }) {
  if (fallback) {
    return (
      <p className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        ⛰️ Real elevation unavailable: temperatures at the model cell elevation ({fmtMeters(model)}), not
        corrected
      </p>
    )
  }
  const delta = real - model
  if (Math.abs(delta) < 40) {
    return (
      <p className="rounded-lg bg-slate-200/70 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
        ⛰️ Real elevation {fmtMeters(real)} ≈ model elevation: no correction needed
      </p>
    )
  }
  return (
    <p className="rounded-lg bg-sky-100/80 px-2.5 py-1.5 text-xs text-sky-900 dark:bg-sky-950/70 dark:text-sky-200">
      ⛰️ Corrected for real elevation <strong>{fmtMeters(real)}</strong> (model:{' '}
      {fmtMeters(model)}, Δ {fmtDelta(delta)})
    </p>
  )
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
        tone === 'accent'
          ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
          : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {children}
    </span>
  )
}

export function SkeletonPanel() {
  return (
    <div className="animate-pulse space-y-3 p-4" aria-label="Loading forecast">
      <div className="h-4 w-3/4 rounded bg-slate-300 dark:bg-slate-700" />
      <div className="h-16 w-full rounded-xl bg-slate-300 dark:bg-slate-700" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-28 w-16 shrink-0 rounded-xl bg-slate-300 dark:bg-slate-700" />
        ))}
      </div>
      <div className="h-36 w-full rounded-xl bg-slate-300 dark:bg-slate-700" />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <p className="text-3xl" aria-hidden>
        ⚠️
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Could not load the forecast.
        <br />
        <span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Retry
      </button>
    </div>
  )
}

/** Wind direction arrow: points where the wind is blowing to. */
export function WindArrow({ directionFrom, className = '' }: { directionFrom: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block ${className}`}
      style={{ transform: `rotate(${(directionFrom + 180) % 360}deg)` }}
    >
      ↑
    </span>
  )
}
