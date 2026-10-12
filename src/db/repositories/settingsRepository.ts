import type { ParquiTimeDB } from '../database'
import { sanitizeSettings, type Settings } from '@/domain/models'

export class SettingsRepository {
  constructor(private readonly db: ParquiTimeDB) {}

  async get(): Promise<Settings> {
    const row = await this.db.settings.get('app')
    return sanitizeSettings((row?.value ?? {}) as Partial<Record<keyof Settings, unknown>>)
  }

  update(patch: Partial<Settings>): Promise<Settings> {
    return this.db.transaction('rw', this.db.settings, async () => {
      const next = sanitizeSettings({ ...(await this.get()), ...patch })
      await this.db.settings.put({ key: 'app', value: next })
      return next
    })
  }
}
