'use client'

import { useCallback, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DayCarouselProps = {
  dates: { date: string; slotCount: number }[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

export function DayCarousel({ dates, selectedDate, onSelectDate }: DayCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrollStep = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const pill = el.querySelector('[data-day-pill]') as HTMLElement | null
    const gap = 8
    const step = (pill?.offsetWidth ?? 72) + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!selectedDate || !scrollerRef.current) return
    const pill = scrollerRef.current.querySelector(
      `[data-date="${selectedDate}"]`
    ) as HTMLElement | null
    pill?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selectedDate, dates.length])

  if (dates.length === 0) return null

  return (
    <div className="relative select-none">
      {dates.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ver dias anteriores"
            className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-[var(--navy)] shadow-md backdrop-blur active:scale-95"
            onClick={() => scrollStep(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Ver próximos dias"
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-[var(--navy)] shadow-md backdrop-blur active:scale-95"
            onClick={() => scrollStep(1)}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-11 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{
          touchAction: 'pan-x pinch-zoom',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {dates.map(({ date, slotCount }) => {
          const active = selectedDate === date
          const d = parseISO(date)
          return (
            <button
              key={date}
              type="button"
              data-day-pill
              data-date={date}
              onClick={() => onSelectDate(date)}
              className={`w-[4.75rem] shrink-0 snap-center snap-always rounded-2xl border px-2 py-3 text-center transition active:scale-[0.98] ${
                active
                  ? 'border-[var(--navy)] bg-[var(--navy)] text-white shadow-md'
                  : 'border-[var(--line)] bg-white hover:border-[var(--pink)]'
              }`}
            >
              <span className="block text-[10px] font-medium uppercase leading-tight opacity-80">
                {format(d, 'EEE', { locale: ptBR })}
              </span>
              <span className="block text-xl font-display font-semibold leading-tight">
                {format(d, 'dd')}
              </span>
              <span className="block text-[10px] opacity-70">{slotCount} vagas</span>
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-center text-[10px] text-[var(--muted)] md:hidden">
        Deslize com o dedo ou use as setas
      </p>
    </div>
  )
}
