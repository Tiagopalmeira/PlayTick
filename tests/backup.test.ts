import { afterEach, describe, expect, it } from 'vitest'
import { BackupError, createBackup, parseBackup, restoreBackup } from '@/db/backup'
import { sessionsToCsv } from '@/domain/services/csv'
import { SettingsRepository } from '@/db/repositories/settingsRepository'
import type { ParquiTimeDB } from '@/db/database'
import { MOTINHA, PULA, setup } from './helpers'

const dbs: ParquiTimeDB[] = []
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete()
})

async function seeded() {
  const ctx = setup()
  dbs.push(ctx.db)
  const moto = await ctx.toys.create(MOTINHA)
  await ctx.toys.create(PULA)
  const s = await ctx.timers.start(moto.id)
  ctx.clock.advanceSec(60)
  await ctx.timers.finish(s.id, 'early', 'Observação; com "aspas"')
  await new SettingsRepository(ctx.db).update({ theme: 'escuro', alertVolume: 0.4 })
  return ctx
}

describe('exportação e importação', () => {
  it('faz o ciclo completo exportar → validar → restaurar em outro aparelho', async () => {
    const src = await seeded()
    const backup = await createBackup(src.db, src.clock.now(), '1.0.0')
    const text = JSON.stringify(backup)

    const dst = setup()
    dbs.push(dst.db)
    await dst.toys.create({ ...MOTINHA, name: 'Será substituído' })
    await restoreBackup(dst.db, parseBackup(text))

    expect((await dst.toys.list()).map((t) => t.name)).toEqual(['Motinha 01', 'Pula-pula 01'])
    const sessions = await dst.db.sessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.priceCents).toBe(1000)
    const settings = await new SettingsRepository(dst.db).get()
    expect(settings.theme).toBe('escuro')
    expect(settings.alertVolume).toBe(0.4)
  })

  it('rejeita arquivos inválidos sem tocar nos dados', async () => {
    expect(() => parseBackup('não é json')).toThrow(BackupError)
    expect(() => parseBackup('{"format":"outro"}')).toThrow(/não é um backup/)
    expect(() => parseBackup(JSON.stringify({ format: 'parquitime-backup', formatVersion: 99, toys: [], sessions: [] }))).toThrow(
      /versão mais nova/,
    )

    const src = await seeded()
    const backup = await createBackup(src.db, src.clock.now(), '1.0.0')
    const broken = structuredClone(backup) as unknown as { toys: Record<string, unknown>[] }
    broken.toys[0]!.priceCents = 10.5
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(/preço inválido/)

    const dup = structuredClone(backup)
    dup.toys.push({ ...dup.toys[0]! })
    expect(() => parseBackup(JSON.stringify(dup))).toThrow(/duplicado/)

    // Os dados originais continuam intactos.
    expect(await src.db.toys.count()).toBe(2)
  })

  it('gera CSV no padrão brasileiro', async () => {
    const src = await seeded()
    const csv = sessionsToCsv(await src.db.sessions.toArray())
    const lines = csv.replace('﻿', '').trim().split('\r\n')
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines[0]).toContain('Data;Brinquedo;Categoria')
    expect(lines[1]).toBe(
      '12/10/2026;Motinha 01;Motinha;14:00;14:01;5,00;1,00;10,00;Concluída;Finalizada antes do tempo;Sim;"Observação; com ""aspas"""',
    )
  })
})
