import type { ParquiTimeDB } from '../database'
import type { Toy, ToyInput } from '@/domain/models'
import { validateToyInput } from '@/domain/models'
import type { Clock } from '@/utils/clock'
import { newId } from '@/utils/id'

export class ValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join(' '))
  }
}

export class ToyRepository {
  constructor(
    private readonly db: ParquiTimeDB,
    private readonly clock: Clock,
  ) {}

  list(): Promise<Toy[]> {
    return this.db.toys.orderBy('order').toArray()
  }

  get(id: string): Promise<Toy | undefined> {
    return this.db.toys.get(id)
  }

  async create(input: ToyInput, opts: { isDemo?: boolean } = {}): Promise<Toy> {
    const errors = validateToyInput(input)
    if (errors.length) throw new ValidationError(errors)
    const now = this.clock.now()
    return this.db.transaction('rw', this.db.toys, async () => {
      const last = await this.db.toys.orderBy('order').last()
      const toy: Toy = {
        id: newId(),
        name: input.name.trim(),
        category: input.category,
        durationSec: input.durationSec,
        priceCents: input.priceCents,
        active: input.active,
        order: (last?.order ?? -1) + 1,
        isDemo: opts.isDemo ?? false,
        createdAt: now,
        updatedAt: now,
      }
      await this.db.toys.add(toy)
      return toy
    })
  }

  /** Alterar o preço/duração padrão não afeta sessões já iniciadas (elas guardam uma cópia). */
  async update(id: string, input: ToyInput): Promise<Toy> {
    const errors = validateToyInput(input)
    if (errors.length) throw new ValidationError(errors)
    return this.db.transaction('rw', this.db.toys, async () => {
      const current = await this.db.toys.get(id)
      if (!current) throw new Error('Brinquedo não encontrado.')
      const next: Toy = {
        ...current,
        name: input.name.trim(),
        category: input.category,
        durationSec: input.durationSec,
        priceCents: input.priceCents,
        active: input.active,
        // Um exemplo editado pelo operador passa a ser um cadastro real.
        isDemo: false,
        updatedAt: this.clock.now(),
      }
      await this.db.toys.put(next)
      return next
    })
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await this.db.toys.update(id, { active, updatedAt: this.clock.now() })
  }

  /** Move o brinquedo uma posição para cima (-1) ou para baixo (+1). */
  async move(id: string, direction: -1 | 1): Promise<void> {
    await this.db.transaction('rw', this.db.toys, async () => {
      const all = await this.db.toys.orderBy('order').toArray()
      const i = all.findIndex((t) => t.id === id)
      const j = i + direction
      if (i < 0 || j < 0 || j >= all.length) return
      const a = all[i]!
      const b = all[j]!
      const now = this.clock.now()
      await this.db.toys.bulkPut([
        { ...a, order: b.order, updatedAt: now },
        { ...b, order: a.order, updatedAt: now },
      ])
    })
  }

  /** Diz por que o brinquedo não pode ser excluído, ou null se for seguro excluir. */
  async deleteBlocker(id: string): Promise<string | null> {
    const count = await this.db.sessions.where('toyId').equals(id).count()
    if (count > 0)
      return 'Este brinquedo tem sessões no histórico. Desative-o para tirá-lo da operação sem perder o histórico.'
    return null
  }

  async remove(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.toys, this.db.sessions, async () => {
      const blocker = await this.deleteBlocker(id)
      if (blocker) throw new Error(blocker)
      await this.db.toys.delete(id)
    })
  }
}
