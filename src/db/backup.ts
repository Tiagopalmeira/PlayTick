/**
 * Exportação e restauração completa dos dados em JSON.
 * O arquivo é validado por inteiro antes de qualquer gravação; a restauração é atômica.
 */
import type { ParquiTimeDB } from './database'
import { LATEST_VERSION } from './migrations'
import {
  TOY_CATEGORIES,
  sanitizeSettings,
  type EndReason,
  type Session,
  type SessionStatus,
  type Settings,
  type Toy,
} from '@/domain/models'

export const BACKUP_FORMAT = 'parquitime-backup'
export const BACKUP_FORMAT_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: number
  toys: Toy[]
  sessions: Session[]
  settings: Settings
}

export class BackupError extends Error {}

export async function createBackup(db: ParquiTimeDB, now: number, appVersion: string): Promise<BackupFile> {
  return db.transaction('r', db.toys, db.sessions, db.settings, async () => {
    const row = await db.settings.get('app')
    return {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: LATEST_VERSION,
      appVersion,
      exportedAt: now,
      toys: await db.toys.orderBy('order').toArray(),
      sessions: await db.sessions.orderBy('startedAt').toArray(),
      settings: sanitizeSettings((row?.value ?? {}) as Partial<Record<keyof Settings, unknown>>),
    }
  })
}

// ——— validação ———

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isInt = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNullableNum = (v: unknown) => v === null || isNum(v)
const STATUSES: SessionStatus[] = ['running', 'paused', 'completed', 'cancelled']
const REASONS: (EndReason | null)[] = ['expired', 'early', 'cancelled', null]

function validateToy(t: unknown, i: number): Toy {
  const where = `Brinquedo ${i + 1}`
  if (!isObj(t)) throw new BackupError(`${where}: formato inválido.`)
  if (!isStr(t.id) || !isStr(t.name)) throw new BackupError(`${where}: id ou nome ausente.`)
  if (!TOY_CATEGORIES.includes(t.category as Toy['category'])) throw new BackupError(`${where}: categoria inválida.`)
  if (!isInt(t.durationSec, 1) || !isInt(t.priceCents)) throw new BackupError(`${where}: duração ou preço inválido.`)
  if (typeof t.active !== 'boolean' || !isNum(t.order)) throw new BackupError(`${where}: estado ou ordem inválidos.`)
  if (!isNum(t.createdAt) || !isNum(t.updatedAt)) throw new BackupError(`${where}: datas inválidas.`)
  return {
    id: t.id,
    name: t.name,
    category: t.category as Toy['category'],
    durationSec: t.durationSec,
    priceCents: t.priceCents,
    active: t.active,
    order: t.order,
    isDemo: t.isDemo === true,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

function validateSession(s: unknown, i: number): Session {
  const where = `Sessão ${i + 1}`
  if (!isObj(s)) throw new BackupError(`${where}: formato inválido.`)
  if (!isStr(s.id) || !isStr(s.toyId) || typeof s.toyName !== 'string')
    throw new BackupError(`${where}: identificação ausente.`)
  if (!TOY_CATEGORIES.includes(s.toyCategory as Toy['category'])) throw new BackupError(`${where}: categoria inválida.`)
  if (!isInt(s.durationSec) || !isInt(s.priceCents)) throw new BackupError(`${where}: duração ou preço inválido.`)
  if (!STATUSES.includes(s.status as SessionStatus)) throw new BackupError(`${where}: status inválido.`)
  if (!REASONS.includes((s.endReason ?? null) as EndReason | null)) throw new BackupError(`${where}: motivo inválido.`)
  if (!isNum(s.startedAt)) throw new BackupError(`${where}: horário de início inválido.`)
  for (const k of ['expectedEndAt', 'remainingMsAtPause', 'pausedAt', 'endedAt', 'consumedSec'] as const)
    if (!isNullableNum(s[k] ?? null)) throw new BackupError(`${where}: campo ${k} inválido.`)
  if (typeof s.operationalDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.operationalDate))
    throw new BackupError(`${where}: data operacional inválida.`)
  const status = s.status as SessionStatus
  if (status === 'running' && !isNum(s.expectedEndAt)) throw new BackupError(`${where}: sessão em andamento sem término previsto.`)
  if (status === 'paused' && !isNum(s.remainingMsAtPause)) throw new BackupError(`${where}: sessão pausada sem tempo restante.`)
  return {
    id: s.id,
    toyId: s.toyId,
    toyName: s.toyName,
    toyCategory: s.toyCategory as Toy['category'],
    durationSec: s.durationSec,
    priceCents: s.priceCents,
    startedAt: s.startedAt,
    expectedEndAt: (s.expectedEndAt as number | null | undefined) ?? null,
    remainingMsAtPause: (s.remainingMsAtPause as number | null | undefined) ?? null,
    pausedAt: (s.pausedAt as number | null | undefined) ?? null,
    endedAt: (s.endedAt as number | null | undefined) ?? null,
    consumedSec: (s.consumedSec as number | null | undefined) ?? null,
    status,
    endReason: (s.endReason as EndReason | null | undefined) ?? null,
    endNote: typeof s.endNote === 'string' ? s.endNote : null,
    alertDismissed: typeof s.alertDismissed === 'boolean' ? s.alertDismissed : true,
    operationalDate: s.operationalDate,
    updatedAt: isNum(s.updatedAt) ? s.updatedAt : s.startedAt,
  }
}

/** Valida o conteúdo bruto de um arquivo de backup. Lança BackupError com mensagem para o operador. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('O arquivo não é um JSON válido.')
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) throw new BackupError('Este arquivo não é um backup do ParquiTime.')
  if (!isInt(raw.formatVersion, 1) || raw.formatVersion > BACKUP_FORMAT_VERSION)
    throw new BackupError('Backup criado por uma versão mais nova do ParquiTime. Atualize o app antes de restaurar.')
  if (!Array.isArray(raw.toys) || !Array.isArray(raw.sessions)) throw new BackupError('Backup incompleto: faltam dados.')

  const toys = raw.toys.map(validateToy)
  const sessions = raw.sessions.map(validateSession)

  const toyIds = new Set<string>()
  for (const t of toys) {
    if (toyIds.has(t.id)) throw new BackupError(`Brinquedo duplicado no backup: ${t.name}.`)
    toyIds.add(t.id)
  }
  const sessionIds = new Set<string>()
  for (const s of sessions) {
    if (sessionIds.has(s.id)) throw new BackupError('Sessão duplicada no backup.')
    sessionIds.add(s.id)
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: raw.formatVersion,
    schemaVersion: isInt(raw.schemaVersion) ? raw.schemaVersion : 1,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'desconhecida',
    exportedAt: isNum(raw.exportedAt) ? raw.exportedAt : 0,
    toys,
    sessions,
    settings: sanitizeSettings(isObj(raw.settings) ? (raw.settings as Partial<Record<keyof Settings, unknown>>) : {}),
  }
}

/** Substitui todos os dados pelos do backup, numa única transação. */
export async function restoreBackup(db: ParquiTimeDB, backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.toys, db.sessions, db.settings, async () => {
    await Promise.all([db.toys.clear(), db.sessions.clear(), db.settings.clear()])
    await db.toys.bulkAdd(backup.toys)
    await db.sessions.bulkAdd(backup.sessions)
    await db.settings.put({ key: 'app', value: backup.settings })
  })
}

/** Apaga todos os dados do aparelho. */
export async function wipeAll(db: ParquiTimeDB): Promise<void> {
  await db.transaction('rw', db.toys, db.sessions, db.settings, db.meta, async () => {
    await Promise.all([db.toys.clear(), db.sessions.clear(), db.settings.clear(), db.meta.clear()])
  })
}
