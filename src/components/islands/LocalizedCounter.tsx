import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { PluralPatterns } from '@/utils/i18n/format'
import { pluralIcu } from '@/utils/i18n/format'

interface CounterLabels {
  increment: string
  reset: string
  patterns: PluralPatterns
}

interface LocalizedCounterProps {
  t: I18n.Schema['blog']['counter']
  initial?: number
  locale: string
  labels: CounterLabels
}

export const LocalizedCounter = ({
  t,
  initial = 0,
  locale,
  labels,
}: LocalizedCounterProps) => {
  const [count, setCount] = useState(initial)

  const formattedLabel = pluralIcu(count, locale, labels.patterns)
  const max = 999

  const handleIncrement = () => {
    setCount((prev) => (prev < max ? prev + 1 : prev))
  }

  const handleReset = () => {
    setCount(initial)
  }

  return (
    <div className="bg-card flex flex-col items-start gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="space-y-5">
        <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {t.title}
        </div>

        <div className="flex w-24 flex-col items-center gap-2">
          <div className="bg-input w-full rounded-md text-center">
            <span
              className={cn(
                'text-4xl font-semibold tabular-nums',
                count === max && 'text-primary',
              )}
            >
              {count}
            </span>
          </div>

          <div className="text-muted-foreground text-sm">{formattedLabel}</div>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={count === max}
          className={cn(
            'text-primary-foreground inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition',
            count === max
              ? 'bg-primary/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90',
          )}
        >
          {labels.increment}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="text-muted-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition"
        >
          {labels.reset}
        </button>
      </div>
    </div>
  )
}
