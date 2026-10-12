import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { ParquiTimeDB } from '@/db/database'
import { LATEST_VERSION, applyMigrations } from '@/db/migrations'
import { uniqueDbName } from './helpers'

const names: string[] = []
afterEach(async () => {
  for (const n of names.splice(0)) await Dexie.delete(n)
})

describe('migração do banco', () => {
  it('atualiza um banco v1 para a versão atual preservando brinquedos e histórico', async () => {
    const name = uniqueDbName()
    names.push(name)

    // Banco criado por uma versão antiga do app (apenas schema v1, sem os campos novos).
    const v1 = new Dexie(name)
    applyMigrations(v1, 1)
    await v1.table('toys').add({
      id: 't1',
      name: 'Motinha antiga',
      category: 'motinha',
      durationSec: 300,
      priceCents: 1000,
      active: true,
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    })
    await v1.table('sessions').bulkAdd([
      {
        id: 's1',
        toyId: 't1',
        toyName: 'Motinha antiga',
        toyCategory: 'motinha',
        durationSec: 300,
        priceCents: 1000,
        startedAt: 1,
        expectedEndAt: null,
        remainingMsAtPause: null,
        pausedAt: null,
        endedAt: 300_001,
        consumedSec: 300,
        status: 'completed',
        endReason: 'expired',
        operationalDate: '2026-10-01',
        updatedAt: 1,
      },
      {
        id: 's2',
        toyId: 't1',
        toyName: 'Motinha antiga',
        toyCategory: 'motinha',
        durationSec: 300,
        priceCents: 1000,
        startedAt: 2,
        expectedEndAt: 300_002,
        remainingMsAtPause: null,
        pausedAt: null,
        endedAt: null,
        consumedSec: null,
        status: 'running',
        endReason: null,
        operationalDate: '2026-10-01',
        updatedAt: 2,
      },
    ])
    await v1.table('settings').put({ key: 'app', value: { theme: 'escuro' } })
    expect(v1.verno).toBe(1)
    v1.close()

    // Abre com a versão atual: o upgrade roda automaticamente.
    const db = new ParquiTimeDB(name)
    await db.open()
    expect(db.verno).toBe(LATEST_VERSION)

    const toy = (await db.toys.get('t1'))!
    expect(toy.name).toBe('Motinha antiga')
    expect(toy.isDemo).toBe(false)

    const done = (await db.sessions.get('s1'))!
    const open = (await db.sessions.get('s2'))!
    expect(done.alertDismissed).toBe(true) // histórico antigo não dispara alertas
    expect(open.alertDismissed).toBe(false)
    expect(done.endNote).toBeNull()
    expect(await db.sessions.where('[operationalDate+status]').equals(['2026-10-01', 'completed']).count()).toBe(1)
    expect((await db.settings.get('app'))!.value.theme).toBe('escuro')
    expect(await db.meta.count()).toBe(0)
    db.close()
  })
})
