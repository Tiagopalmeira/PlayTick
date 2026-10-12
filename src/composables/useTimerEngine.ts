/**
 * Motor de atualização da interface. Ele NÃO mede o tempo: só agenda redesenhos e pede ao
 * TimerService para conferir expirações. Ao voltar do segundo plano, reconcilia tudo com o banco.
 */
import { readonly, ref } from 'vue'
import { clock, onSessionsExpired, timerService } from './services'
import { useSettings } from './useSettings'
import { isAudioUnlocked, playExpiredAlert, unlockAudio, vibrateExpired } from '@/platform/alertSound'
import { toast } from './useToast'

const now = ref(clock.now())
const audioReady = ref(false)
let started = false

/** Instante atual, atualizado ~4x por segundo enquanto o app está visível. */
export function useNow() {
  return readonly(now)
}

/** Falso até o primeiro toque: antes disso o navegador bloqueia o som dos alertas. */
export function useAudioReady() {
  return readonly(audioReady)
}

export function startTimerEngine(): void {
  if (started) return
  started = true
  const { settings } = useSettings()

  onSessionsExpired((sessions) => {
    const s = settings.value
    if (s.soundEnabled) playExpiredAlert(s.alertVolume)
    if (s.vibrationEnabled) vibrateExpired()
    const names = sessions.map((x) => x.toyName).join(', ')
    toast(sessions.length === 1 ? `Tempo esgotado: ${names}` : `Tempos esgotados: ${names}`, 'error', 5000)
  })

  let interval: ReturnType<typeof setInterval> | null = null
  let checking = false

  const tick = async () => {
    now.value = clock.now()
    if (checking) return
    checking = true
    try {
      await timerService.checkExpirations()
    } finally {
      checking = false
    }
  }

  const resume = async () => {
    now.value = clock.now()
    await timerService.reconcile()
    now.value = clock.now()
  }

  const startInterval = () => {
    interval ??= setInterval(() => void tick(), 250)
  }
  const stopInterval = () => {
    if (interval) clearInterval(interval)
    interval = null
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void resume()
      startInterval()
    } else {
      // Em segundo plano o navegador pode suspender timers; o estado continua correto
      // porque tudo é recalculado a partir dos timestamps ao voltar.
      stopInterval()
    }
  })
  window.addEventListener('pageshow', () => void resume())
  window.addEventListener('focus', () => void resume())

  // Áudio só pode ser liberado após um gesto do usuário.
  const unlock = () => {
    unlockAudio()
    setTimeout(() => (audioReady.value = isAudioUnlocked()), 150)
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)

  void resume()
  startInterval()
}
