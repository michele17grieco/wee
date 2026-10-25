import type { ActivityConfig } from '../lib/activities'
import { fmtDayShort, fmtTemp } from '../lib/format'
import type { DayRow } from '../types'

/** Secondary badge of the day, tailored to the activity. */
function dayBadge(d: DayRow, activity: ActivityConfig): string {
  if (activity.snowHighlight && d.snowSum >= 0.5) return `❄️ ${d.snowSum.toFixed(0)} cm`
  if (d.precipSum >= 0.5) return `💧 ${d.precipSum.toFixed(0)} mm`
  if (activity.sunHighlight && d.sunshineHours !== null) return `☀️ ${Math.round(d.sunshineHours)} h`
  if (d.gustMax !== null && d.gustMax >= (activity.gustWarn ?? 45)) return `💨 ${Math.round(d.gustMax)}`
  return ''
}

export default function DaySelector({
  days,
  selectedIndex,
  onSelect,
  activity,
}: {
  days: DayRow[]
  selectedIndex: number
  onSelect: (i: number) => void
  activity: ActivityConfig
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Select the day">
      {days.map((d, i) => {
        const selected = i === selectedIndex
        return (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(i)}
            className={`flex w-[4.4rem] shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-center ${
              selected
                ? 'bg-sky-500 text-white ring-2 ring-sky-500'
                : 'bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'
            }`}
          >
            <span className={`text-xs font-medium capitalize ${selected ? '' : 'text-slate-500 dark:text-slate-400'}`}>
              {i === 0 ? 'Today' : fmtDayShort(d.date)}
            </span>
            <span className="text-xl leading-none" aria-hidden>
              {d.icon}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {fmtTemp(d.tMax)}
              <span className={`ml-0.5 font-normal ${selected ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                {fmtTemp(d.tMin)}
              </span>
            </span>
            <span className={`h-4 text-[0.65rem] tabular-nums ${selected ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
              {dayBadge(d, activity)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
