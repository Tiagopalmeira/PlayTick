/**
 * Histórico de versões do IndexedDB. Regra: nunca editar uma versão publicada —
 * sempre acrescentar uma nova, com upgrade que preserve os dados existentes.
 */
import type Dexie from 'dexie'
import type { Transaction } from 'dexie'

export interface Migration {
  version: number
  stores: Record<string, string | null>
  upgrade?: (tx: Transaction) => Promise<void>
}

export const MIGRATIONS: Migration[] = [
  {
    // v1 — estrutura inicial.
    version: 1,
    stores: {
      toys: 'id, order, active, category',
      sessions: 'id, toyId, status, operationalDate, startedAt, [toyId+status]',
      settings: 'key',
    },
  },
  {
    // v2 — tabela "meta" (marcadores internos), alerta dispensável e marcação de dados de exemplo.
    version: 2,
    stores: {
      sessions: 'id, toyId, status, operationalDate, startedAt, [toyId+status], [operationalDate+status]',
      meta: 'key',
    },
    async upgrade(tx) {
      await tx
        .table('sessions')
        .toCollection()
        .modify((s: Record<string, unknown>) => {
          if (typeof s.alertDismissed !== 'boolean') s.alertDismissed = s.status !== 'running' && s.status !== 'paused'
          if (s.endNote === undefined) s.endNote = null
        })
      await tx
        .table('toys')
        .toCollection()
        .modify((t: Record<string, unknown>) => {
          if (typeof t.isDemo !== 'boolean') t.isDemo = false
        })
    },
  },
]

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version

export function applyMigrations(db: Dexie, upTo = LATEST_VERSION): void {
  for (const m of MIGRATIONS) {
    if (m.version > upTo) break
    const v = db.version(m.version).stores(m.stores)
    if (m.upgrade) v.upgrade(m.upgrade)
  }
}
