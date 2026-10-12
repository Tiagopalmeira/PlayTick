import { afterEach, describe, expect, it } from 'vitest'
import { summarize } from '@/domain/services/revenue'
import { SessionRepository } from '@/db/repositories/sessionRepository'
import type { ParquiTimeDB } from '@/db/database'
import { MOTINHA, PULA, setup } from './helpers'

const dbs: ParquiTimeDB[] = []
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete()
})

describe('faturamento', () => {
  it('conta concluídas como receita, separa canceladas e ignora sessões abertas', async () => {
    const ctx = setup()
    dbs.push(ctx.db)
    const { toys, timers, clock, db } = ctx
    const moto = await toys.create(MOTINHA) // R$ 10,00 / 5 min
    const pula = await toys.create(PULA) // R$ 15,00 / 15 min

    const s1 = await timers.start(moto.id)
    clock.advanceSec(300)
    await timers.checkExpirations() // concluída por tempo: +10
    const s2 = await timers.start(moto.id)
    clock.advanceSec(60)
    await timers.finish(s2.id, 'early') // concluída antes do tempo: +10
    const s3 = await timers.start(moto.id)
    await timers.finish(s3.id, 'cancelled') // cancelada: não conta
    const s4 = await timers.start(pula.id) // em andamento: em aberto
    const s5 = await timers.start(moto.id)
    await timers.pause(s5.id) // pausada: em aberto

    const summary = summarize(await new SessionRepository(db).list({ date: '2026-10-12' }))
    expect(summary.completedCount).toBe(2)
    expect(summary.earlyCount).toBe(1)
    expect(summary.cancelledCount).toBe(1)
    expect(summary.openCount).toBe(2)
    expect(summary.netCents).toBe(2000)
    expect(summary.cancelledCents).toBe(1000)
    expect(summary.grossCents).toBe(3000)
    expect(summary.grossCents - summary.cancelledCents).toBe(summary.netCents)
    expect(summary.openCents).toBe(2500)
    expect(summary.byToy).toEqual([
      { toyId: moto.id, toyName: 'Motinha 01', category: 'motinha', completed: 2, cancelled: 1, revenueCents: 2000 },
    ])
    expect([s1, s4].every(Boolean)).toBe(true)
  })

  it('não conta a mesma sessão duas vezes', () => {
    const base = {
      id: 'x',
      toyId: 't',
      toyName: 'T',
      toyCategory: 'motinha' as const,
      durationSec: 60,
      priceCents: 700,
      startedAt: 0,
      expectedEndAt: null,
      remainingMsAtPause: null,
      pausedAt: null,
      endedAt: 60_000,
      consumedSec: 60,
      status: 'completed' as const,
      endReason: 'expired' as const,
      endNote: null,
      alertDismissed: true,
      operationalDate: '2026-10-12',
      updatedAt: 0,
    }
    expect(summarize([base, { ...base }]).netCents).toBe(700)
  })

  it('não mistura dias diferentes', async () => {
    const ctx = setup()
    dbs.push(ctx.db)
    const { toys, timers, clock, db } = ctx
    const moto = await toys.create(MOTINHA)
    const a = await timers.start(moto.id)
    await timers.finish(a.id, 'early')
    clock.advance(24 * 3600 * 1000)
    const b = await timers.start(moto.id)
    await timers.finish(b.id, 'early')

    const repo = new SessionRepository(db)
    expect(summarize(await repo.list({ date: '2026-10-12' })).netCents).toBe(1000)
    expect(summarize(await repo.list({ date: '2026-10-13' })).netCents).toBe(1000)
    expect(await repo.listDates()).toEqual(['2026-10-13', '2026-10-12'])
  })

  it('valores em centavos inteiros não acumulam erro de ponto flutuante', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      toyId: 't',
      toyName: 'T',
      toyCategory: 'motinha' as const,
      durationSec: 60,
      priceCents: 10,
      startedAt: 0,
      expectedEndAt: null,
      remainingMsAtPause: null,
      pausedAt: null,
      endedAt: 1,
      consumedSec: 60,
      status: 'completed' as const,
      endReason: 'expired' as const,
      endNote: null,
      alertDismissed: true,
      operationalDate: '2026-10-12',
      updatedAt: 0,
    }))
    expect(summarize(sessions).netCents).toBe(100)
  })
})
