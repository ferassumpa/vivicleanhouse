import type { PricingType, Property } from '@/lib/types'

export function resolvePropertyPrice(
  property: Property,
  pricingType?: PricingType,
  hours?: number | null
): { pricing_type: PricingType; unit_price: number; revenue_amount: number; hours: number | null } {
  const type = pricingType || property.default_pricing_type

  if (type === 'hourly') {
    const unit = Number(property.price_hourly || 0)
    const h = hours && hours > 0 ? hours : (property.estimated_duration_minutes || 120) / 60
    return {
      pricing_type: type,
      unit_price: unit,
      hours: h,
      revenue_amount: unit * h,
    }
  }

  if (type === 'package') {
    const unit = Number(property.price_package || 0)
    return {
      pricing_type: type,
      unit_price: unit,
      hours: null,
      revenue_amount: unit,
    }
  }

  const unit = Number(property.price_fixed || 0)
  return {
    pricing_type: 'per_property',
    unit_price: unit,
    hours: null,
    revenue_amount: unit,
  }
}

export function combineDateAndTime(date: string, time: string): string {
  // date: YYYY-MM-DD, time: HH:MM or HH:MM:SS
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}`).toISOString()
}
