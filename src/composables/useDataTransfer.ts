import type { Session } from '@/domain/models'
import { BackupError, createBackup, parseBackup, restoreBackup, wipeAll } from '@/db/backup'
import { sessionsToCsv } from '@/domain/services/csv'
import { downloadText, pickTextFile, stampedName } from '@/platform/files'
import { APP_VERSION, clock, db, sessionRepo, settingsRepo, timerService } from './services'
import { confirmAction } from './useConfirm'
import { toast, toastError } from './useToast'

export async function exportBackup(): Promise<void> {
  try {
    const now = clock.now()
    const backup = await createBackup(db, now, APP_VERSION)
    downloadText(stampedName('parquitime-backup', 'json', now), JSON.stringify(backup, null, 2), 'application/json')
    await settingsRepo.update({ lastExportAt: now })
    toast('Cópia de segurança salva em Downloads', 'success')
  } catch (e) {
    toastError(e, 'Não foi possível gerar a cópia de segurança.')
  }
}

export async function importBackup(): Promise<void> {
  try {
    const file = await pickTextFile('application/json,.json')
    if (!file) return
    const backup = parseBackup(file.text) // valida tudo antes de qualquer gravação
    const open = await sessionRepo.listOpen()
    if (open.length > 0) {
      toast('Finalize as sessões em andamento antes de restaurar uma cópia.', 'error')
      return
    }
    const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('pt-BR', { hourCycle: 'h23' }) : 'data desconhecida'
    const ok = await confirmAction({
      title: 'Restaurar cópia de segurança?',
      message: `A cópia de ${when} tem ${backup.toys.length} brinquedos e ${backup.sessions.length} sessões. Ela vai substituir todos os dados atuais deste celular.`,
      confirmLabel: 'Restaurar e substituir',
      danger: true,
    })
    if (!ok) return
    await restoreBackup(db, backup)
    await timerService.reconcile()
    toast('Cópia restaurada', 'success')
  } catch (e) {
    toastError(e, e instanceof BackupError ? e.message : 'Não foi possível ler o arquivo.')
  }
}

export function exportCsv(sessions: readonly Session[], label: string): void {
  if (sessions.length === 0) {
    toast('Não há sessões para exportar com esses filtros.', 'info')
    return
  }
  downloadText(stampedName(`parquitime-historico-${label}`, 'csv', clock.now()), sessionsToCsv(sessions), 'text/csv;charset=utf-8')
  toast(`${sessions.length} sessões exportadas em CSV`, 'success')
}

export async function exportAllCsv(): Promise<void> {
  exportCsv(await sessionRepo.list(), 'completo')
}

export async function wipeEverything(): Promise<boolean> {
  const ok = await confirmAction({
    title: 'Apagar todos os dados?',
    message:
      'Brinquedos, histórico, faturamento e configurações serão apagados deste celular. Não é possível desfazer. Salve uma cópia de segurança antes, se precisar.',
    confirmLabel: 'Apagar tudo',
    danger: true,
    requireText: 'APAGAR',
  })
  if (!ok) return false
  await wipeAll(db)
  await timerService.reconcile()
  toast('Todos os dados foram apagados', 'info')
  return true
}
