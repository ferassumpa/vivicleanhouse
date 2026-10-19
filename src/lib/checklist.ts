import { supabase } from '@/lib/supabase'
import type { ChecklistItem } from '@/lib/types'

/** Itens do checklist: personalizado do imóvel, senão o padrão global */
export async function resolveChecklistItems(propertyId: string): Promise<ChecklistItem[]> {
  const { data: custom } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('property_id', propertyId)
    .eq('active', true)
    .order('sort_order')

  if (custom && custom.length > 0) {
    return custom as ChecklistItem[]
  }

  const { data: defaults } = await supabase
    .from('checklist_items')
    .select('*')
    .is('property_id', null)
    .eq('active', true)
    .order('sort_order')

  return (defaults as ChecklistItem[]) || []
}

/** Garante que a faxina tenha linhas de checklist (copia na primeira abertura) */
export async function ensureCleaningChecklist(cleaningId: string, propertyId: string) {
  const { data: existing } = await supabase
    .from('cleaning_checklist')
    .select('id')
    .eq('cleaning_id', cleaningId)
    .limit(1)

  if (existing && existing.length > 0) return

  const items = await resolveChecklistItems(propertyId)
  if (items.length === 0) return

  await supabase.from('cleaning_checklist').insert(
    items.map((item) => ({
      cleaning_id: cleaningId,
      checklist_item_id: item.id,
      label: item.label,
      done: false,
    }))
  )
}
