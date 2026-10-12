import { CATEGORY_LABEL, STATUS_LABEL, type Session } from '../models'
import { formatOperationalDate, formatTime } from '@/utils/format'

const END_LABEL = {
  expired: 'Tempo esgotado',
  early: 'Finalizada antes do tempo',
  cancelled: 'Cancelada sem cobrança',
} as const

function cell(v: string | number): string {
  const s = String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Histórico em CSV no padrão brasileiro (separador ";" e vírgula decimal), com BOM
 * para abrir corretamente no Excel e no Planilhas Google.
 */
export function sessionsToCsv(sessions: readonly Session[]): string {
  const header = [
    'Data',
    'Brinquedo',
    'Categoria',
    'Início',
    'Término',
    'Duração contratada (min)',
    'Tempo usado (min)',
    'Valor (R$)',
    'Status',
    'Encerramento',
    'Conta como receita',
    'Observação',
  ]
  const rows = [...sessions]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => [
      formatOperationalDate(s.operationalDate),
      s.toyName,
      CATEGORY_LABEL[s.toyCategory],
      formatTime(s.startedAt),
      s.endedAt ? formatTime(s.endedAt) : '',
      (s.durationSec / 60).toFixed(2).replace('.', ','),
      s.consumedSec === null ? '' : (s.consumedSec / 60).toFixed(2).replace('.', ','),
      (s.priceCents / 100).toFixed(2).replace('.', ','),
      STATUS_LABEL[s.status],
      s.endReason ? END_LABEL[s.endReason] : '',
      s.status === 'completed' ? 'Sim' : 'Não',
      s.endNote ?? '',
    ])
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
}
