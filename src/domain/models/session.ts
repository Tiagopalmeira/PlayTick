import type { ToyCategory } from './toy'

export type SessionStatus = 'running' | 'paused' | 'completed' | 'cancelled'

export const STATUS_LABEL: Record<SessionStatus, string> = {
  running: 'Em andamento',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

/**
 * Como a sessão terminou.
 * - expired: o tempo contratado acabou.
 * - early: finalizada antes do tempo, com cobrança integral.
 * - cancelled: cancelada sem cobrança.
 */
export type EndReason = 'expired' | 'early' | 'cancelled'

export interface Session {
  id: string
  toyId: string
  /** Cópia dos dados comerciais no momento do início. */
  toyName: string
  toyCategory: ToyCategory
  /** Duração contratada em segundos. */
  durationSec: number
  /** Preço cobrado em centavos — nunca muda depois do início. */
  priceCents: number
  startedAt: number
  /** Instante previsto de término (apenas enquanto em andamento). */
  expectedEndAt: number | null
  /** Tempo restante congelado na pausa (ms). */
  remainingMsAtPause: number | null
  pausedAt: number | null
  endedAt: number | null
  /** Tempo efetivamente consumido em segundos (preenchido ao encerrar). */
  consumedSec: number | null
  status: SessionStatus
  endReason: EndReason | null
  /** Observação livre do motivo de encerramento antecipado. */
  endNote: string | null
  /** Alerta de tempo esgotado já dispensado pelo operador. */
  alertDismissed: boolean
  /** Data operacional (AAAA-MM-DD, horário local) à qual a sessão pertence. */
  operationalDate: string
  updatedAt: number
}

export const isOpen = (s: Pick<Session, 'status'>): boolean => s.status === 'running' || s.status === 'paused'
