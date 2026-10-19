export type NotifyVars = {
  cliente: string
  imovel: string
  hora: string
  endereco?: string
  predio?: string
}

/** Remove tudo que não é dígito e garante DDI 55 quando for BR sem código */
export function normalizePhoneForWa(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`
  }
  return digits
}

export function fillTemplate(body: string, vars: NotifyVars): string {
  return body
    .replaceAll('{cliente}', vars.cliente || '')
    .replaceAll('{imovel}', vars.imovel || '')
    .replaceAll('{hora}', vars.hora || '')
    .replaceAll('{endereco}', vars.endereco || '')
    .replaceAll('{predio}', vars.predio || '')
}

/**
 * api.whatsapp.com + URLSearchParams preserva emoji (UTF-8) melhor que
 * montar wa.me na mão — evita a carinha virar "?" no app.
 */
export function buildWaMeUrl(phoneDigits: string, text: string): string {
  const params = new URLSearchParams()
  params.set('phone', phoneDigits)
  params.set('text', text)
  return `https://api.whatsapp.com/send?${params.toString()}`
}

export function openWhatsApp(phone: string | null | undefined, text: string): boolean {
  const digits = normalizePhoneForWa(phone)
  if (!digits) return false
  const url = buildWaMeUrl(digits, text)
  // location.assign costuma manter encoding melhor que window.open em alguns browsers
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    window.location.href = url
  }
  return true
}
