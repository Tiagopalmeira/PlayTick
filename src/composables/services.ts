/** Instâncias únicas dos serviços do app (composição manual, sem framework de DI). */
import { getDb } from '@/db/database'
import { ToyRepository } from '@/db/repositories/toyRepository'
import { SessionRepository } from '@/db/repositories/sessionRepository'
import { SettingsRepository } from '@/db/repositories/settingsRepository'
import { TimerService } from '@/domain/services/timerService'
import type { Session } from '@/domain/models'
import { systemClock } from '@/utils/clock'

type ExpiredListener = (sessions: Session[]) => void
const expiredListeners = new Set<ExpiredListener>()

export const db = getDb()
export const clock = systemClock
export const toyRepo = new ToyRepository(db, clock)
export const sessionRepo = new SessionRepository(db)
export const settingsRepo = new SettingsRepository(db)
export const timerService = new TimerService(db, clock, {
  onExpired: (sessions) => expiredListeners.forEach((fn) => fn(sessions)),
})

export function onSessionsExpired(fn: ExpiredListener): () => void {
  expiredListeners.add(fn)
  return () => expiredListeners.delete(fn)
}

export const APP_VERSION = __APP_VERSION__
