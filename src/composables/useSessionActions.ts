import { shallowRef } from 'vue'
import type { Session } from '@/domain/models'
import type { FinishMode } from '@/domain/services/timerService'
import { timerService } from './services'
import { useSettings } from './useSettings'
import { toast, toastError } from './useToast'

/** Sessão aguardando a escolha de como finalizar (folha de finalização aberta). */
const finishing = shallowRef<Session | null>(null)

export function useFinishSheet() {
  return finishing
}

/** Ações operacionais com feedback. Usadas pela tela de operação e pela tela de sessão. */
export function useSessionActions() {
  const { settings } = useSettings()

  const run = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn()
    } catch (e) {
      toastError(e)
      return undefined
    }
  }

  return {
    start: (toyId: string) => run(() => timerService.start(toyId)),
    pause: (id: string) => run(() => timerService.pause(id)),
    resume: (id: string) => run(() => timerService.resume(id)),
    dismiss: (id: string) => run(() => timerService.dismissAlert(id)),

    /** "Finalizar": pergunta ou cobra direto, conforme a configuração. */
    requestFinish: async (s: Session) => {
      if (settings.value.earlyEndBehavior === 'cobrar') {
        const ended = await run(() => timerService.finish(s.id, 'early'))
        if (ended) toast(`${ended.toyName} finalizado`, 'success')
        return
      }
      finishing.value = s
    },

    finish: async (id: string, mode: FinishMode, note: string | null) => {
      finishing.value = null
      const ended = await run(() => timerService.finish(id, mode, note))
      if (!ended) return
      if (ended.endReason === 'expired') toast(`${ended.toyName}: o tempo já tinha acabado`, 'info')
      else if (mode === 'cancelled') toast(`Sessão de ${ended.toyName} cancelada sem cobrança`, 'info')
      else toast(`${ended.toyName} finalizado`, 'success')
    },
  }
}
