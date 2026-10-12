/**
 * Alerta sonoro sintetizado com Web Audio (sem arquivo de áudio, funciona offline).
 * Navegadores só liberam áudio depois de uma interação do usuário: `unlock()` é chamado
 * no primeiro toque na tela e nada toca antes disso.
 */
type AudioCtor = typeof AudioContext

let ctx: AudioContext | null = null

function getCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export function unlockAudio(): void {
  const Ctor = getCtor()
  if (!Ctor) return
  try {
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

export function isAudioUnlocked(): boolean {
  return ctx !== null && ctx.state === 'running'
}

/**
 * Três bipes curtos e ascendentes (~1,1 s no total): perceptível num parque cheio,
 * curto o bastante para não incomodar.
 */
export function playExpiredAlert(volume: number): void {
  if (!ctx || volume <= 0) return
  if (ctx.state === 'suspended') void ctx.resume()
  const start = ctx.currentTime + 0.02
  const notes = [880, 1175, 1568]
  const peak = Math.min(1, Math.max(0, volume)) * 0.6
  notes.forEach((freq, i) => {
    const t = start + i * 0.32
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 0.45 : 0.22))
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t)
    osc.stop(t + 0.5)
  })
}

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrateExpired(): void {
  if (canVibrate()) navigator.vibrate([220, 120, 220, 120, 420])
}
