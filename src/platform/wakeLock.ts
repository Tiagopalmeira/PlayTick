/** Mantém a tela ligada enquanto houver sessões em andamento (Screen Wake Lock API, quando suportada). */
let sentinel: WakeLockSentinel | null = null
let wanted = false

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator

async function acquire(): Promise<void> {
  if (!wakeLockSupported() || sentinel || document.visibilityState !== 'visible') return
  try {
    sentinel = await navigator.wakeLock.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    sentinel = null // economia de bateria ou permissão negada: segue sem wake lock
  }
}

export async function setWakeLock(on: boolean): Promise<void> {
  wanted = on
  if (on) await acquire()
  else if (sentinel) {
    await sentinel.release().catch(() => undefined)
    sentinel = null
  }
}

if (typeof document !== 'undefined') {
  // O sistema libera o wake lock quando a aba vai para segundo plano; pede de novo ao voltar.
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire()
  })
}
