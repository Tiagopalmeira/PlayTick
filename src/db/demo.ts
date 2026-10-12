/**
 * Dados de exemplo — apenas para conhecer o app. Ficam marcados com isDemo e podem ser
 * removidos de uma vez (junto com as sessões feitas neles). Nomes deixam claro que são exemplos.
 */
import type { ParquiTimeDB } from './database'
import type { ToyInput } from '@/domain/models'
import { ToyRepository } from './repositories/toyRepository'
import type { Clock } from '@/utils/clock'

const DEMO_TOYS: ToyInput[] = [
  { name: 'Motinha A (exemplo)', category: 'motinha', durationSec: 5 * 60, priceCents: 1000, active: true },
  { name: 'Motinha B (exemplo)', category: 'motinha', durationSec: 10 * 60, priceCents: 1500, active: true },
  { name: 'Pula-pula (exemplo)', category: 'pula-pula', durationSec: 15 * 60, priceCents: 1500, active: true },
]

export async function addDemoToys(db: ParquiTimeDB, clock: Clock): Promise<void> {
  const repo = new ToyRepository(db, clock)
  for (const t of DEMO_TOYS) await repo.create(t, { isDemo: true })
}

export async function countDemoToys(db: ParquiTimeDB): Promise<number> {
  return db.toys.filter((t) => t.isDemo).count()
}

export async function removeDemoData(db: ParquiTimeDB): Promise<void> {
  await db.transaction('rw', db.toys, db.sessions, async () => {
    const ids = (await db.toys.filter((t) => t.isDemo).toArray()).map((t) => t.id)
    if (ids.length === 0) return
    await db.sessions.where('toyId').anyOf(ids).delete()
    await db.toys.bulkDelete(ids)
  })
}
