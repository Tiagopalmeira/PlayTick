import Dexie, { type Table } from 'dexie'
import type { Session, Settings, Toy } from '@/domain/models'
import { applyMigrations } from './migrations'

export const DB_NAME = 'parquitime'

export interface SettingsRow {
  key: 'app'
  value: Settings
}

export interface MetaRow {
  key: string
  value: unknown
}

export class ParquiTimeDB extends Dexie {
  toys!: Table<Toy, string>
  sessions!: Table<Session, string>
  settings!: Table<SettingsRow, string>
  meta!: Table<MetaRow, string>

  constructor(name = DB_NAME) {
    super(name)
    applyMigrations(this)
  }
}

let instance: ParquiTimeDB | null = null

/** Banco padrão do app (singleton). Testes criam instâncias próprias com nomes únicos. */
export function getDb(): ParquiTimeDB {
  instance ??= new ParquiTimeDB()
  return instance
}
