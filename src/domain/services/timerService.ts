/**
 * Serviço central de cronômetros — independente de Vue.
 *
 * Fonte da verdade: as sessões persistidas no IndexedDB, com `expectedEndAt` (em andamento)
 * ou `remainingMsAtPause` (pausada). Timers JavaScript servem apenas para chamar
 * `checkExpirations()` com frequência; nenhuma contagem depende de quantas vezes eles rodaram.
 */
import type { ParquiTimeDB } from '@/db/database'
import type { Session } from '../models'
import { isOpen } from '../models'
import type { Clock } from '@/utils/clock'
import { newId } from '@/utils/id'
import {
  SessionRuleError,
  createSession,
  endSession,
  isExpired,
  pauseSession,
  resumeSession,
} from './sessionRules'

export type FinishMode = 'early' | 'cancelled'

export interface TimerServiceEvents {
  /** Chamado uma única vez por sessão, quando ela é encerrada por tempo esgotado. */
  onExpired?: (sessions: Session[]) => void
}

export class TimerService {
  /** Cache em memória: id → término previsto, só das sessões em andamento. */
  private readonly running = new Map<string, number>()
  /** Sessões em processo de encerramento — impede encerramento duplo concorrente. */
  private readonly finalizing = new Set<string>()

  constructor(
    private readonly db: ParquiTimeDB,
    private readonly clock: Clock,
    private readonly events: TimerServiceEvents = {},
  ) {}

  /**
   * Reconcilia o estado em memória com o banco e encerra tudo o que expirou enquanto
   * o app estava fechado, em segundo plano ou com a tela bloqueada.
   */
  async reconcile(): Promise<Session[]> {
    const open = await this.db.sessions.where('status').anyOf('running', 'paused').toArray()
    this.running.clear()
    for (const s of open) if (s.status === 'running' && s.expectedEndAt !== null) this.running.set(s.id, s.expectedEndAt)
    return this.checkExpirations()
  }

  /** Encerra as sessões cujo término previsto já passou. Barato quando nada expirou (não acessa o banco). */
  async checkExpirations(): Promise<Session[]> {
    const now = this.clock.now()
    const due = [...this.running.entries()].filter(([, end]) => end <= now).map(([id]) => id)
    if (due.length === 0) return []
    const expired: Session[] = []
    for (const id of due) {
      const s = await this.expire(id)
      if (s) expired.push(s)
    }
    if (expired.length) this.events.onExpired?.(expired)
    return expired
  }

  /** Próximo instante em que alguma sessão vai expirar (para agendar a próxima verificação). */
  nextDeadline(): number | null {
    let min: number | null = null
    for (const end of this.running.values()) if (min === null || end < min) min = end
    return min
  }

  async start(toyId: string): Promise<Session> {
    const now = this.clock.now()
    const session = await this.db.transaction('rw', this.db.toys, this.db.sessions, async () => {
      const toy = await this.db.toys.get(toyId)
      if (!toy) throw new SessionRuleError('Brinquedo não encontrado.')
      const open = await this.db.sessions
        .where('[toyId+status]')
        .anyOf([toyId, 'running'], [toyId, 'paused'])
        .first()
      if (open) throw new SessionRuleError(`${toy.name} já está com uma sessão aberta.`)
      // Iniciar de novo dispensa o alerta de tempo esgotado anterior deste brinquedo.
      await this.db.sessions
        .where('toyId')
        .equals(toyId)
        .filter((s) => s.status === 'completed' && !s.alertDismissed)
        .modify({ alertDismissed: true })
      const s = createSession(toy, newId(), now)
      await this.db.sessions.add(s)
      return s
    })
    this.track(session)
    return session
  }

  async pause(id: string): Promise<Session> {
    if (await this.expireIfDue(id)) throw new SessionRuleError('O tempo desta sessão já acabou.')
    return this.mutate(id, (s, now) => pauseSession(s, now))
  }

  async resume(id: string): Promise<Session> {
    return this.mutate(id, (s, now) => resumeSession(s, now))
  }

  /**
   * Encerramento pelo operador. Se o tempo já tinha acabado, a sessão é registrada como
   * esgotada (e não como antecipada) — o resultado é o mesmo, sem contagem dupla.
   */
  async finish(id: string, mode: FinishMode, note: string | null = null): Promise<Session> {
    const expired = await this.expireIfDue(id)
    if (expired) return expired
    return this.mutate(id, (s, now) => endSession(s, mode, now, note))
  }

  async dismissAlert(id: string): Promise<void> {
    await this.db.sessions.update(id, { alertDismissed: true })
  }

  async dismissAllAlerts(): Promise<void> {
    await this.db.sessions
      .where('status')
      .equals('completed')
      .filter((s) => !s.alertDismissed)
      .modify({ alertDismissed: true })
  }

  // ——— internos ———

  private track(s: Session): void {
    if (s.status === 'running' && s.expectedEndAt !== null) this.running.set(s.id, s.expectedEndAt)
    else this.running.delete(s.id)
  }

  private async expireIfDue(id: string): Promise<Session | null> {
    const end = this.running.get(id)
    if (end === undefined || end > this.clock.now()) return null
    const s = await this.expire(id)
    if (s) this.events.onExpired?.([s])
    return s ?? (await this.db.sessions.get(id)) ?? null
  }

  /**
   * Encerra por tempo esgotado. Idempotente: retorna a sessão apenas para a chamada que de fato
   * fez a transição; chamadas repetidas ou concorrentes retornam null.
   */
  private async expire(id: string): Promise<Session | null> {
    if (this.finalizing.has(id)) return null
    this.finalizing.add(id)
    try {
      const result = await this.db.transaction('rw', this.db.sessions, async () => {
        const s = await this.db.sessions.get(id)
        const now = this.clock.now()
        if (!s || !isExpired(s, now)) return { session: s, changed: false }
        const ended = endSession(s, 'expired', now)
        await this.db.sessions.put(ended)
        return { session: ended, changed: true }
      })
      if (result.session) this.track(result.session)
      else this.running.delete(id)
      return result.changed ? (result.session ?? null) : null
    } finally {
      this.finalizing.delete(id)
    }
  }

  private async mutate(id: string, fn: (s: Session, now: number) => Session): Promise<Session> {
    const next = await this.db.transaction('rw', this.db.sessions, async () => {
      const s = await this.db.sessions.get(id)
      if (!s) throw new SessionRuleError('Sessão não encontrada.')
      if (!isOpen(s)) throw new SessionRuleError('A sessão já foi encerrada.')
      const updated = fn(s, this.clock.now())
      await this.db.sessions.put(updated)
      return updated
    })
    this.track(next)
    return next
  }
}
