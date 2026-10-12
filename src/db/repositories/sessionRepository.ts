import type { ParquiTimeDB } from '../database'
import type { Session } from '@/domain/models'

export interface SessionFilter {
  /** Data operacional AAAA-MM-DD. */
  date?: string
  toyId?: string
  category?: Session['toyCategory']
  status?: Session['status']
}

export class SessionRepository {
  constructor(private readonly db: ParquiTimeDB) {}

  get(id: string): Promise<Session | undefined> {
    return this.db.sessions.get(id)
  }

  /** Sessões em andamento ou pausadas. */
  listOpen(): Promise<Session[]> {
    return this.db.sessions.where('status').anyOf('running', 'paused').toArray()
  }

  /** Sessões abertas + sessões esgotadas cujo alerta ainda não foi dispensado. */
  async listBoard(): Promise<Session[]> {
    const open = await this.listOpen()
    const alerts = await this.db.sessions
      .where('status')
      .equals('completed')
      .filter((s) => !s.alertDismissed)
      .toArray()
    return [...open, ...alerts]
  }

  findOpenForToy(toyId: string): Promise<Session | undefined> {
    return this.db.sessions
      .where('[toyId+status]')
      .anyOf([toyId, 'running'], [toyId, 'paused'])
      .first()
  }

  async list(filter: SessionFilter = {}): Promise<Session[]> {
    const base = filter.date
      ? this.db.sessions.where('operationalDate').equals(filter.date)
      : this.db.sessions.toCollection()
    const rows = await base
      .filter(
        (s) =>
          (!filter.toyId || s.toyId === filter.toyId) &&
          (!filter.category || s.toyCategory === filter.category) &&
          (!filter.status || s.status === filter.status),
      )
      .toArray()
    return rows.sort((a, b) => b.startedAt - a.startedAt)
  }

  /** Datas operacionais com sessões, mais recentes primeiro. */
  async listDates(): Promise<string[]> {
    const keys = (await this.db.sessions.orderBy('operationalDate').uniqueKeys()) as string[]
    return keys.reverse()
  }
}
