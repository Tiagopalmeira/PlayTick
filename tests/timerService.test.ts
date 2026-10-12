import { afterEach, describe, expect, it } from 'vitest'
import { ParquiTimeDB } from '@/db/database'
import { TimerService } from '@/domain/services/timerService'
import { remainingMs } from '@/domain/services/sessionRules'
import { MOTINHA, PULA, setup } from './helpers'

const dbs: ParquiTimeDB[] = []
function track<T extends { db: ParquiTimeDB }>(ctx: T): T {
  dbs.push(ctx.db)
  return ctx
}
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete()
})

describe('início de sessão', () => {
  it('cria sessão em andamento com término previsto e cópia dos dados comerciais', async () => {
    const { toys, timers, clock } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)

    expect(s.status).toBe('running')
    expect(s.expectedEndAt).toBe(clock.now() + 300_000)
    expect(s.toyName).toBe('Motinha 01')
    expect(s.priceCents).toBe(1000)
    expect(s.durationSec).toBe(300)
    expect(s.operationalDate).toBe('2026-10-12')
    expect(remainingMs(s, clock.now())).toBe(300_000)
  })

  it('não permite duas sessões abertas no mesmo brinquedo', async () => {
    const { toys, timers } = track(setup())
    const toy = await toys.create(MOTINHA)
    await timers.start(toy.id)
    await expect(timers.start(toy.id)).rejects.toThrow(/já está com uma sessão aberta/)
  })

  it('não inicia brinquedo desativado', async () => {
    const { toys, timers } = track(setup())
    const toy = await toys.create({ ...MOTINHA, active: false })
    await expect(timers.start(toy.id)).rejects.toThrow(/desativado/)
  })

  it('o tempo restante vem do timestamp, não de quantos ticks rodaram', async () => {
    const { toys, timers, clock, db } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(123) // nenhum tick rodou nesse intervalo
    const stored = (await db.sessions.get(s.id))!
    expect(remainingMs(stored, clock.now())).toBe(177_000)
  })
})

describe('pausa e retomada', () => {
  it('congela o tempo restante na pausa e recalcula o término ao retomar', async () => {
    const { toys, timers, clock } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)

    clock.advanceSec(60)
    const paused = await timers.pause(s.id)
    expect(paused.status).toBe('paused')
    expect(paused.remainingMsAtPause).toBe(240_000)
    expect(paused.expectedEndAt).toBeNull()

    clock.advanceSec(600) // pausada por 10 minutos: não pode consumir tempo
    expect(remainingMs(paused, clock.now())).toBe(240_000)
    expect(await timers.checkExpirations()).toEqual([])

    const resumed = await timers.resume(s.id)
    expect(resumed.status).toBe('running')
    expect(resumed.expectedEndAt).toBe(clock.now() + 240_000)
  })

  it('não pausa uma sessão cujo tempo já acabou — encerra como esgotada', async () => {
    const { toys, timers, clock, db } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(301)
    await expect(timers.pause(s.id)).rejects.toThrow(/já acabou/)
    expect((await db.sessions.get(s.id))!.status).toBe('completed')
  })
})

describe('expiração', () => {
  it('encerra a sessão como concluída e registra o término no instante previsto', async () => {
    const { toys, timers, clock, expiredEvents } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    const expectedEnd = s.expectedEndAt!

    clock.advanceSec(299)
    expect(await timers.checkExpirations()).toEqual([])

    clock.advanceSec(45) // app só voltou a rodar 44 s depois do fim
    const [expired] = await timers.checkExpirations()
    expect(expired!.status).toBe('completed')
    expect(expired!.endReason).toBe('expired')
    expect(expired!.endedAt).toBe(expectedEnd)
    expect(expired!.consumedSec).toBe(300)
    expect(expired!.alertDismissed).toBe(false)
    expect(expiredEvents).toHaveLength(1)
  })

  it('finalização é idempotente mesmo com verificações concorrentes', async () => {
    const { toys, timers, clock, expiredEvents, db } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(400)

    const results = await Promise.all([
      timers.checkExpirations(),
      timers.checkExpirations(),
      timers.reconcile(),
      timers.checkExpirations(),
    ])
    const total = results.reduce((n, r) => n + r.length, 0)
    expect(total).toBe(1)
    expect(expiredEvents.flat()).toHaveLength(1)

    // Um segundo serviço (outra aba, por exemplo) também não encerra de novo.
    const other = new TimerService(db, clock)
    expect(await other.reconcile()).toEqual([])
    expect((await db.sessions.get(s.id))!.updatedAt).toBe(clock.now())
  })

  it('finalizar manualmente depois do tempo acabar registra como esgotada, sem duplicar', async () => {
    const { toys, timers, clock, expiredEvents } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(310)
    const ended = await timers.finish(s.id, 'early')
    expect(ended.endReason).toBe('expired')
    await expect(timers.finish(s.id, 'early')).rejects.toThrow(/já foi encerrada/)
    expect(expiredEvents.flat()).toHaveLength(1)
  })

  it('iniciar de novo dispensa o alerta anterior do brinquedo', async () => {
    const { toys, timers, clock, db } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(301)
    await timers.checkExpirations()
    await timers.start(toy.id)
    expect((await db.sessions.get(s.id))!.alertDismissed).toBe(true)
  })
})

describe('encerramento antecipado', () => {
  it('cobra o valor integral e registra o tempo consumido', async () => {
    const { toys, timers, clock } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(90)
    const ended = await timers.finish(s.id, 'early', 'Criança quis descer')
    expect(ended.status).toBe('completed')
    expect(ended.endReason).toBe('early')
    expect(ended.consumedSec).toBe(90)
    expect(ended.priceCents).toBe(1000)
    expect(ended.endNote).toBe('Criança quis descer')
    expect(ended.alertDismissed).toBe(true)
  })

  it('cancelamento de sessão pausada usa o tempo consumido até a pausa', async () => {
    const { toys, timers, clock } = track(setup())
    const toy = await toys.create(MOTINHA)
    const s = await timers.start(toy.id)
    clock.advanceSec(30)
    await timers.pause(s.id)
    clock.advanceSec(500)
    const ended = await timers.finish(s.id, 'cancelled')
    expect(ended.status).toBe('cancelled')
    expect(ended.consumedSec).toBe(30)
  })
})

describe('múltiplos cronômetros', () => {
  it('cada brinquedo tem seu próprio cronômetro', async () => {
    const { toys, timers, clock, db } = track(setup())
    const a = await toys.create(MOTINHA)
    const b = await toys.create({ ...MOTINHA, name: 'Motinha 02', durationSec: 120 })
    const c = await toys.create(PULA)

    const sa = await timers.start(a.id)
    clock.advanceSec(30)
    const sb = await timers.start(b.id)
    clock.advanceSec(30)
    const sc = await timers.start(c.id)
    await timers.pause(sa.id)

    clock.advanceSec(100) // B (120 s, iniciada há 130 s) expira; A pausada; C segue
    const expired = await timers.checkExpirations()
    expect(expired.map((s) => s.id)).toEqual([sb.id])

    const now = clock.now()
    expect(remainingMs((await db.sessions.get(sa.id))!, now)).toBe(240_000)
    expect(remainingMs((await db.sessions.get(sc.id))!, now)).toBe(800_000)
    expect(timers.nextDeadline()).toBe(sc.expectedEndAt)
  })
})

describe('persistência e reconciliação', () => {
  it('após recarregar, recalcula o tempo a partir do banco', async () => {
    const first = track(setup())
    const toy = await first.toys.create(MOTINHA)
    const s = await first.timers.start(toy.id)
    first.db.close()

    // "Reabre" o app 2 minutos depois, com um novo banco e um novo serviço.
    first.clock.advanceSec(120)
    const second = track(setup(first.name, first.clock))
    expect(await second.timers.reconcile()).toEqual([])
    const stored = (await second.db.sessions.get(s.id))!
    expect(stored.status).toBe('running')
    expect(remainingMs(stored, second.clock.now())).toBe(180_000)
    expect(second.timers.nextDeadline()).toBe(s.expectedEndAt)
  })

  it('ao reabrir, encerra sessões que expiraram com o app fechado e mantém as pausadas', async () => {
    const first = track(setup())
    const a = await first.toys.create(MOTINHA)
    const b = await first.toys.create(PULA)
    const sa = await first.timers.start(a.id)
    const sb = await first.timers.start(b.id)
    await first.timers.pause(sb.id)
    first.db.close()

    first.clock.advanceSec(3600)
    const second = track(setup(first.name, first.clock))
    const expired = await second.timers.reconcile()
    expect(expired.map((s) => s.id)).toEqual([sa.id])
    expect(expired[0]!.endedAt).toBe(sa.expectedEndAt)
    expect(second.expiredEvents).toHaveLength(1)
    expect((await second.db.sessions.get(sb.id))!.status).toBe('paused')
  })
})

describe('preço registrado', () => {
  it('alterar o preço padrão não altera sessões antigas nem abertas', async () => {
    const { toys, timers, clock, db } = track(setup())
    const toy = await toys.create(MOTINHA)
    const old = await timers.start(toy.id)
    clock.advanceSec(60)
    await timers.finish(old.id, 'early')
    const open = await timers.start(toy.id)

    await toys.update(toy.id, { ...MOTINHA, priceCents: 2500, durationSec: 600, name: 'Motinha Azul' })

    const storedOld = (await db.sessions.get(old.id))!
    const storedOpen = (await db.sessions.get(open.id))!
    expect(storedOld.priceCents).toBe(1000)
    expect(storedOld.toyName).toBe('Motinha 01')
    expect(storedOpen.priceCents).toBe(1000)
    expect(storedOpen.durationSec).toBe(300)

    await timers.finish(open.id, 'early')
    const next = await timers.start(toy.id)
    expect(next.priceCents).toBe(2500)
    expect(next.durationSec).toBe(600)
  })
})
