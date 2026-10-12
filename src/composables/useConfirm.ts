import { shallowRef } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  /** Exige que o usuário digite este texto para confirmar (ações irreversíveis). */
  requireText?: string
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

const pending = shallowRef<Pending | null>(null)

export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  pending.value?.resolve(false)
  return new Promise((resolve) => {
    pending.value = { ...opts, resolve }
  })
}

export function useConfirmState() {
  const settle = (ok: boolean) => {
    pending.value?.resolve(ok)
    pending.value = null
  }
  return { pending, settle }
}
