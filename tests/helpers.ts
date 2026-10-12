import { ParquiTimeDB } from '@/db/database'
import { ToyRepository } from '@/db/repositories/toyRepository'
import { TimerService } from '@/domain/services/timerService'
import type { Session, ToyInput } from '@/domain/models'
import type { Clock } from '@/utils/clock'

/** Relógio simulado: o tempo só anda quando o teste manda. */
export class FakeClock implements Clock {
  constructor(public t = new Date(2026, 9, 12, 14, 0, 0).getTime()) {}
  now() {
    return this.t
  }
  advance(ms: number) {
    this.t += ms
  }
  advanceSec(s: number) {
    this.t += s * 1000
  }
}

let counter = 0
export const uniqueDbName = () => `parquitime-test-${Date.now()}-${counter++}`

export const MOTINHA: ToyInput = { name: 'Motinha 01', category: 'motinha', durationSec: 300, priceCents: 1000, active: true }
export const PULA: ToyInput = { name: 'Pula-pula 01', category: 'pula-pula', durationSec: 900, priceCents: 1500, active: true }

export function setup(name = uniqueDbName(), clock = new FakeClock()) {
  const db = new ParquiTimeDB(name)
  const toys = new ToyRepository(db, clock)
  const expiredEvents: Session[][] = []
  const timers = new TimerService(db, clock, { onExpired: (s) => expiredEvents.push(s) })
  return { db, clock, toys, timers, expiredEvents, name }
}
