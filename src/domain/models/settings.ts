export type ThemePreference = 'sistema' | 'claro' | 'escuro'

/** O que acontece ao tocar em "Finalizar" antes do tempo acabar. */
export type EarlyEndBehavior = 'perguntar' | 'cobrar'

export interface Settings {
  theme: ThemePreference
  soundEnabled: boolean
  /** Volume dos alertas, 0 a 1. */
  alertVolume: number
  vibrationEnabled: boolean
  earlyEndBehavior: EarlyEndBehavior
  /** Mantém a tela ligada enquanto houver sessões em andamento (quando suportado). */
  keepScreenOn: boolean
  /** Lembrar de exportar backup a cada N dias (0 = nunca). */
  backupReminderDays: number
  lastExportAt: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'sistema',
  soundEnabled: true,
  alertVolume: 0.8,
  vibrationEnabled: true,
  earlyEndBehavior: 'perguntar',
  keepScreenOn: true,
  backupReminderDays: 7,
  lastExportAt: null,
}

export function sanitizeSettings(raw: Partial<Record<keyof Settings, unknown>>): Settings {
  const s = { ...DEFAULT_SETTINGS }
  if (raw.theme === 'sistema' || raw.theme === 'claro' || raw.theme === 'escuro') s.theme = raw.theme
  if (typeof raw.soundEnabled === 'boolean') s.soundEnabled = raw.soundEnabled
  if (typeof raw.alertVolume === 'number' && Number.isFinite(raw.alertVolume))
    s.alertVolume = Math.min(1, Math.max(0, raw.alertVolume))
  if (typeof raw.vibrationEnabled === 'boolean') s.vibrationEnabled = raw.vibrationEnabled
  if (raw.earlyEndBehavior === 'perguntar' || raw.earlyEndBehavior === 'cobrar') s.earlyEndBehavior = raw.earlyEndBehavior
  if (typeof raw.keepScreenOn === 'boolean') s.keepScreenOn = raw.keepScreenOn
  if (typeof raw.backupReminderDays === 'number' && Number.isInteger(raw.backupReminderDays) && raw.backupReminderDays >= 0)
    s.backupReminderDays = raw.backupReminderDays
  if (typeof raw.lastExportAt === 'number' && Number.isFinite(raw.lastExportAt)) s.lastExportAt = raw.lastExportAt
  return s
}
