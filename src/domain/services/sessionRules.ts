/**
 * Regras puras de sessão. Nenhuma função aqui lê o relógio: o instante "now" é sempre recebido.
 * O tempo restante é derivado de timestamps — nunca de um contador decrementado.
 */
import type { EndReason, Session, Toy } from '../models'
import { toOperationalDate } from '../../utils/format'

export class SessionRuleError extends Error {}

export function createSession(toy: Toy, id: string, now: number): Session {
  if (!toy.active) throw new SessionRuleError('Este brinquedo está desativado.')
  const durationMs = toy.durationSec * 1000
  return {
    id,
    toyId: toy.id,
    toyName: toy.name,
    toyCategory: toy.category,
    durationSec: toy.durationSec,
    priceCents: toy.priceCents,
    startedAt: now,
    expectedEndAt: now + durationMs,
    remainingMsAtPause: null,
    pausedAt: null,
    endedAt: null,
    consumedSec: null,
    status: 'running',
    endReason: null,
    endNote: null,
    alertDismissed: false,
    operationalDate: toOperationalDate(now),
    updatedAt: now,
  }
}

/** Tempo restante em ms no instante `now`. */
export function remainingMs(s: Session, now: number): number {
  switch (s.status) {
    case 'running':
      return Math.max(0, (s.expectedEndAt ?? now) - now)
    case 'paused':
      return Math.max(0, s.remainingMsAtPause ?? 0)
    default:
      return 0
  }
}

/** Fração já consumida (0..1) — usada nas barras de progresso. */
export function progress(s: Session, now: number): number {
  const total = s.durationSec * 1000
  if (total <= 0) return 1
  if (s.status === 'completed' || s.status === 'cancelled') return 1
  return Math.min(1, Math.max(0, 1 - remainingMs(s, now) / total))
}

export function isExpired(s: Session, now: number): boolean {
  return s.status === 'running' && s.expectedEndAt !== null && now >= s.expectedEndAt
}

export function pauseSession(s: Session, now: number): Session {
  if (s.status !== 'running') throw new SessionRuleError('Só é possível pausar uma sessão em andamento.')
  if (isExpired(s, now)) throw new SessionRuleError('O tempo desta sessão já acabou.')
  return {
    ...s,
    status: 'paused',
    remainingMsAtPause: remainingMs(s, now),
    pausedAt: now,
    expectedEndAt: null,
    updatedAt: now,
  }
}

export function resumeSession(s: Session, now: number): Session {
  if (s.status !== 'paused') throw new SessionRuleError('Só é possível continuar uma sessão pausada.')
  const left = s.remainingMsAtPause ?? 0
  return {
    ...s,
    status: 'running',
    expectedEndAt: now + left,
    remainingMsAtPause: null,
    pausedAt: null,
    updatedAt: now,
  }
}

/**
 * Encerra a sessão. Para "expired", o término registrado é o instante previsto
 * (e não o momento em que o app percebeu), mesmo que o celular estivesse bloqueado.
 */
export function endSession(s: Session, reason: EndReason, now: number, note: string | null = null): Session {
  if (s.status !== 'running' && s.status !== 'paused') throw new SessionRuleError('A sessão já foi encerrada.')
  const endedAt = reason === 'expired' && s.expectedEndAt !== null ? Math.min(now, s.expectedEndAt) : now
  const left = s.status === 'running' ? Math.max(0, (s.expectedEndAt ?? endedAt) - endedAt) : (s.remainingMsAtPause ?? 0)
  const consumedSec = Math.max(0, Math.round((s.durationSec * 1000 - left) / 1000))
  return {
    ...s,
    status: reason === 'cancelled' ? 'cancelled' : 'completed',
    endReason: reason,
    endNote: note,
    endedAt,
    consumedSec,
    expectedEndAt: null,
    remainingMsAtPause: s.status === 'paused' ? s.remainingMsAtPause : null,
    // Encerramentos feitos pelo operador não geram alerta pendente.
    alertDismissed: reason !== 'expired',
    updatedAt: now,
  }
}
