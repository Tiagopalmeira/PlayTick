import { reactive } from 'vue'

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  text: string
}

const toasts = reactive<Toast[]>([])
let seq = 0

export function toast(text: string, kind: ToastKind = 'info', ms = 3200): void {
  const id = ++seq
  toasts.push({ id, kind, text })
  if (toasts.length > 3) toasts.shift()
  setTimeout(() => dismissToast(id), kind === 'error' ? ms * 1.6 : ms)
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

/** Mostra a mensagem de um erro de forma legível para o operador. */
export function toastError(e: unknown, fallback = 'Não foi possível concluir a ação.'): void {
  toast(e instanceof Error && e.message ? e.message : fallback, 'error')
}

export function useToasts() {
  return toasts
}
