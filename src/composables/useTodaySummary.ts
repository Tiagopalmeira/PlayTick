import { computed } from 'vue'
import type { Session } from '@/domain/models'
import { summarize } from '@/domain/services/revenue'
import { toOperationalDate } from '@/utils/format'
import { sessionRepo } from './services'
import { useLiveQuery } from './useLiveQuery'
import { useNow } from './useTimerEngine'

/** Resumo do dia operacional atual; troca sozinho de dia à meia-noite. */
export function useTodaySummary() {
  const now = useNow()
  const today = computed(() => toOperationalDate(now.value))
  const { data } = useLiveQuery(() => sessionRepo.list({ date: today.value }), [] as Session[], [today])
  const summary = computed(() => summarize(data.value))
  return { today, summary }
}
