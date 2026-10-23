import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns'

/** Duração mínima de uma faxina (agenda em blocos de 2 h). */
export const MIN_CLEANING_DURATION_MINUTES = 120

export type SlotTimeInput = {
  slot_date: string
  start_time: string
  end_time: string
}

function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export function formatTimeFromMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function addMinutesToTime(time: string, minutes: number): string {
  return formatTimeFromMinutes(timeToMinutes(time) + minutes)
}

export function defaultEndTimeFromStart(startTime: string): string {
  return addMinutesToTime(startTime, MIN_CLEANING_DURATION_MINUTES)
}

export function validateSlotDuration(startTime: string, endTime: string): string | null {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime)
  if (diff <= 0) return 'O horário de fim deve ser depois do início.'
  if (diff < MIN_CLEANING_DURATION_MINUTES) {
    return `Cada faxina precisa de no mínimo ${MIN_CLEANING_DURATION_MINUTES / 60} horas na agenda.`
  }
  return null
}

export function generateDaySlots(
  slotDate: string,
  dayStart: string,
  dayEnd: string,
  durationMinutes: number = MIN_CLEANING_DURATION_MINUTES
): SlotTimeInput[] {
  const startMin = timeToMinutes(dayStart)
  const endMin = timeToMinutes(dayEnd)
  const slots: SlotTimeInput[] = []

  for (let cursor = startMin; cursor + durationMinutes <= endMin; cursor += durationMinutes) {
    slots.push({
      slot_date: slotDate,
      start_time: formatTimeFromMinutes(cursor),
      end_time: formatTimeFromMinutes(cursor + durationMinutes),
    })
  }
  return slots
}

export function generateSlotsForRange(
  fromDate: string,
  toDate: string,
  dayStart: string,
  dayEnd: string,
  durationMinutes: number = MIN_CLEANING_DURATION_MINUTES
): SlotTimeInput[] {
  const from = parseISO(fromDate)
  const to = parseISO(toDate)
  if (from > to) return []

  const days = eachDayOfInterval({ start: from, end: to })
  const out: SlotTimeInput[] = []
  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')
    out.push(...generateDaySlots(dateStr, dayStart, dayEnd, durationMinutes))
  }
  return out
}

export function slotKey(slot: Pick<SlotTimeInput, 'slot_date' | 'start_time'>): string {
  return `${slot.slot_date}|${slot.start_time.slice(0, 5)}`
}

/** Evita duplicar o mesmo dia/hora ao gerar em lote. */
export function filterNewSlots(
  candidates: SlotTimeInput[],
  existing: Pick<SlotTimeInput, 'slot_date' | 'start_time'>[]
): SlotTimeInput[] {
  const taken = new Set(existing.map(slotKey))
  return candidates.filter((c) => !taken.has(slotKey(c)))
}

export function nextWeekdayDefault(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}
