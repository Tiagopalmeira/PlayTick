import { computed, watchEffect } from 'vue'
import { DEFAULT_SETTINGS, type Settings } from '@/domain/models'
import { settingsRepo } from './services'
import { useLiveQuery } from './useLiveQuery'

let shared: ReturnType<typeof create> | null = null

function create() {
  const { data, ready } = useLiveQuery(() => settingsRepo.get(), DEFAULT_SETTINGS)
  const settings = computed<Settings>(() => data.value)

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const applyTheme = () => {
    const t = settings.value.theme
    const dark = t === 'escuro' || (t === 'sistema' && media.matches)
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0F172A')
    try {
      localStorage.setItem('parquitime:theme', t) // espelho para aplicar o tema antes da primeira pintura
    } catch {
      /* armazenamento indisponível */
    }
  }
  media.addEventListener('change', applyTheme)
  watchEffect(() => {
    if (ready.value) applyTheme()
  })

  return {
    settings,
    ready,
    update: (patch: Partial<Settings>) => settingsRepo.update(patch),
  }
}

/** Configurações compartilhadas pelo app inteiro (criadas uma vez, no App.vue). */
export function useSettings() {
  shared ??= create()
  return shared
}
