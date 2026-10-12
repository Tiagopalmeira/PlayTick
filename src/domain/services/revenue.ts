/**
 * Regra de faturamento (documentada também no README):
 *
 * - Toda sessão é cobrada no início (o cliente paga antes de usar), com o preço copiado do brinquedo.
 * - "Concluída" (tempo esgotado ou finalizada antes do tempo) conta como receita, pelo valor integral registrado.
 * - "Cancelada" não conta como receita. O valor aparece separado como cancelamento (estorno ao cliente).
 * - "Em andamento" ou "Pausada" ainda não conta: aparece como "em aberto".
 * - Faturamento bruto = concluídas + canceladas (tudo o que foi iniciado e encerrado).
 *   Faturamento líquido = bruto − cancelamentos = soma das concluídas.
 * - Cada sessão pertence a exatamente um status e a uma data operacional, então nunca é contada duas vezes
 *   nem misturada entre dias.
 */
import type { Session, ToyCategory } from '../models'

export interface ToyBreakdown {
  toyId: string
  toyName: string
  category: ToyCategory
  completed: number
  cancelled: number
  revenueCents: number
}

export interface RevenueSummary {
  completedCount: number
  earlyCount: number
  cancelledCount: number
  openCount: number
  grossCents: number
  cancelledCents: number
  netCents: number
  openCents: number
  byToy: ToyBreakdown[]
}

export function summarize(sessions: readonly Session[]): RevenueSummary {
  const sum: RevenueSummary = {
    completedCount: 0,
    earlyCount: 0,
    cancelledCount: 0,
    openCount: 0,
    grossCents: 0,
    cancelledCents: 0,
    netCents: 0,
    openCents: 0,
    byToy: [],
  }
  const toys = new Map<string, ToyBreakdown>()
  const seen = new Set<string>()

  for (const s of sessions) {
    if (seen.has(s.id)) continue
    seen.add(s.id)
    let row = toys.get(s.toyId)
    if (!row) {
      row = { toyId: s.toyId, toyName: s.toyName, category: s.toyCategory, completed: 0, cancelled: 0, revenueCents: 0 }
      toys.set(s.toyId, row)
    }
    switch (s.status) {
      case 'completed':
        sum.completedCount++
        if (s.endReason === 'early') sum.earlyCount++
        sum.netCents += s.priceCents
        sum.grossCents += s.priceCents
        row.completed++
        row.revenueCents += s.priceCents
        break
      case 'cancelled':
        sum.cancelledCount++
        sum.cancelledCents += s.priceCents
        sum.grossCents += s.priceCents
        row.cancelled++
        break
      case 'running':
      case 'paused':
        sum.openCount++
        sum.openCents += s.priceCents
        break
    }
  }
  sum.byToy = [...toys.values()]
    .filter((r) => r.completed + r.cancelled > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents || a.toyName.localeCompare(b.toyName, 'pt-BR'))
  return sum
}
