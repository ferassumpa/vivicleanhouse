import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'viviclenaer-auth-token',
    },
  }
)

export function getSupabaseAdmin() {
  const adminKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !adminKey) {
    throw new Error('Missing Supabase admin env vars')
  }
  return createClient(supabaseUrl, adminKey)
}

export async function getCleaningPhotoUrl(path: string): Promise<string | null> {
  if (!path) return null
  const { data } = await supabase.storage
    .from('cleaning-photos')
    .createSignedUrl(path, 60 * 60 * 24)
  return data?.signedUrl ?? null
}
