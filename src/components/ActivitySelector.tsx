import type { ActivityId } from '../lib/activities'
import { ACTIVITIES, ACTIVITY_ORDER } from '../lib/activities'

export default function ActivitySelector({
  value,
  onChange,
}: {
  value: ActivityId
  onChange: (a: ActivityId) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Activity mode">
      {ACTIVITY_ORDER.map((id) => {
        const a = ACTIVITIES[id]
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'border-sky-500 bg-sky-500 text-white'
                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {a.emoji} {a.label}
          </button>
        )
      })}
    </div>
  )
}
