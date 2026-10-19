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
  // 10–11 dígitos = Brasil sem DDI
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

export function buildWaMeUrl(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`
}

export function openWhatsApp(phone: string | null | undefined, text: string): boolean {
  const digits = normalizePhoneForWa(phone)
  if (!digits) return false
  const url = buildWaMeUrl(digits, text)
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
