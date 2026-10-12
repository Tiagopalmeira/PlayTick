const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 1050 → "R$ 10,50" */
export function formatMoney(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, ' ')
}

/**
 * Converte texto digitado em centavos inteiros. Aceita "10", "10,5", "10,50", "R$ 1.234,56".
 * Retorna null quando o texto não é um valor válido.
 */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/R\$|\s/g, '')
  if (!clean) return null
  if (!/^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$|^\d+(\.\d{1,2})?$/.test(clean)) return null
  let normalized: string
  if (clean.includes(',')) normalized = clean.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, '')
  else normalized = clean
  const [int = '0', frac = ''] = normalized.split('.')
  return Number(int) * 100 + Number((frac + '00').slice(0, 2))
}

/** Centavos → texto editável "10,50". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Segundos → "5 min", "1 min 30 s", "1 h 05 min". Para rótulos. */
export function formatDurationLabel(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return m > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`
  if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`
  return `${s} s`
}

/** Milissegundos restantes → "04:32" ou "1:04:32". Arredonda para cima: 0,2 s restante ainda mostra 00:01. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const longDateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** "14:05" (24 horas) */
export function formatTime(ts: number): string {
  return timeFmt.format(ts)
}

/** "domingo, 12 de outubro" */
export function formatLongDate(ts: number): string {
  return longDateFmt.format(ts)
}

/** "2026-10-12" → "12/10/2026" */
export function formatOperationalDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return shortDateFmt.format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1))
}

/** Data operacional local AAAA-MM-DD. */
export function toOperationalDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
