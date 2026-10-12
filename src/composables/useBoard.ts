import { computed } from 'vue'
import type { Session, Toy } from '@/domain/models'
import { remainingMs } from '@/domain/services/sessionRules'
import { db, sessionRepo } from './services'
import { useLiveQuery } from './useLiveQuery'
import { useNow } from './useTimerEngine'

export type LaneState = 'idle' | 'running' | 'paused' | 'expired'

export interface Lane {
  toy: Toy
  session: Session | null
  state: LaneState
  remaining: number
}

/** Quadro de operação: brinquedos ativos com a sessão atual de cada um (ou o alerta pendente). */
export function useBoard() {
  const now = useNow()
  const toys = useLiveQuery(() => db.toys.orderBy('order').toArray(), [] as Toy[])
  const board = useLiveQuery(() => sessionRepo.listBoard(), [] as Session[])

  const lanes = computed<Lane[]>(() => {
    const byToy = new Map<string, Session>()
    for (const s of board.data.value) {
      const prev = byToy.get(s.toyId)
      // Sessão aberta tem prioridade sobre alerta antigo.
      if (!prev || (s.status === 'running' || s.status === 'paused') || s.startedAt > prev.startedAt) byToy.set(s.toyId, s)
    }
    return toys.data.value
      .filter((t) => t.active || byToy.has(t.id))
      .map((toy) => {
        const session = byToy.get(toy.id) ?? null
        const state: LaneState = !session
          ? 'idle'
          : session.status === 'running'
            ? remainingMs(session, now.value) <= 0
              ? 'expired'
              : 'running'
            : session.status === 'paused'
              ? 'paused'
              : 'expired'
        return { toy, session, state, remaining: session ? remainingMs(session, now.value) : toy.durationSec * 1000 }
      })
  })

  const counts = computed(() => {
    const c = { running: 0, paused: 0, expired: 0 }
    for (const l of lanes.value) if (l.state !== 'idle') c[l.state]++
    return c
  })

  return {
    toys: toys.data,
    lanes,
    counts,
    ready: computed(() => toys.ready.value && board.ready.value),
    error: computed(() => toys.error.value ?? board.error.value),
  }
}
