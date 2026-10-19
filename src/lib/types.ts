export type UserRole = 'admin' | 'employee' | 'client'
export type PricingType = 'hourly' | 'package' | 'per_property'
export type CleaningStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'done'
  | 'cancelled'
export type PhotoKind = 'before' | 'after'

export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  role: UserRole
}

export type Client = {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export type Employee = {
  id: string
  user_id: string | null
  full_name: string
  phone: string | null
  pay_per_cleaning: number
  active: boolean
  created_at: string
}

export type Building = {
  id: string
  name: string
  address: string | null
  syndic_name: string | null
  syndic_phone: string | null
  doorman_name: string | null
  doorman_phone: string | null
  caretaker_name: string | null
  caretaker_phone: string | null
  entry_rules: string | null
  notes: string | null
  created_at?: string
}

export type ServicePackage = {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  cleanings_count: number
  is_monthly: boolean
  includes_laundry: boolean
  includes_dishes: boolean
  includes_ironing: boolean
  extras: string | null
  active: boolean
  created_at?: string
}

export type Property = {
  id: string
  client_id: string
  building_id: string | null
  label: string
  property_type: string
  address: string | null
  access_notes: string | null
  default_pricing_type: PricingType
  price_hourly: number | null
  price_package: number | null
  price_fixed: number | null
  estimated_duration_minutes: number
  service_package_id?: string | null
  active: boolean
  clients?: Pick<Client, 'id' | 'full_name'> | null
  buildings?: Pick<Building, 'id' | 'name' | 'address' | 'entry_rules' | 'doorman_name' | 'doorman_phone' | 'syndic_name' | 'syndic_phone' | 'caretaker_name' | 'caretaker_phone'> | null
  service_packages?: Pick<ServicePackage, 'id' | 'name' | 'price' | 'cleanings_count' | 'is_monthly'> | null
}

export type AvailabilitySlot = {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  employee_id: string | null
  is_open: boolean
  notes: string | null
}

export type Cleaning = {
  id: string
  property_id: string
  client_id: string
  employee_id: string | null
  availability_slot_id: string | null
  scheduled_start: string
  scheduled_end: string | null
  status: CleaningStatus
  pricing_type: PricingType
  unit_price: number
  hours: number | null
  revenue_amount: number
  employee_pay_amount: number
  materials_cost: number
  other_costs: number
  notes: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  properties?: Pick<Property, 'id' | 'label' | 'address' | 'access_notes' | 'building_id'> & {
    buildings?: Property['buildings']
  } | null
  clients?: Pick<Client, 'id' | 'full_name'> | null
  employees?: Pick<Employee, 'id' | 'full_name'> | null
}

export type Material = {
  id: string
  name: string
  unit_cost: number
  active: boolean
}

export type ChecklistItem = {
  id: string
  property_id: string | null
  label: string
  sort_order: number
  active: boolean
}

export type CleaningChecklistRow = {
  id: string
  cleaning_id: string
  checklist_item_id: string | null
  label: string
  done: boolean
  done_at: string | null
}

export const STATUS_LABELS: Record<CleaningStatus, string> = {
  requested: 'Pendente (aguardando admin)',
  confirmed: 'Confirmada',
  in_progress: 'Em andamento',
  done: 'Concluída',
  cancelled: 'Cancelada',
}

export const PRICING_LABELS: Record<PricingType, string> = {
  hourly: 'Por hora',
  package: 'Por pacote',
  per_property: 'Por imóvel',
}

export function cleaningMargin(c: Cleaning): number {
  return (
    Number(c.revenue_amount) -
    Number(c.employee_pay_amount) -
    Number(c.materials_cost) -
    Number(c.other_costs)
  )
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0)
}

export function formatCleaningWhen(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
