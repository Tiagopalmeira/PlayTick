<script setup lang="ts">
import { computed } from 'vue'
import { BellOff, Pause, Play, RotateCcw, Square, TimerOff } from 'lucide-vue-next'
import { db } from '@/composables/services'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { useNow } from '@/composables/useTimerEngine'
import { useSessionActions } from '@/composables/useSessionActions'
import { CATEGORY_LABEL, STATUS_LABEL, type Session } from '@/domain/models'
import { progress, remainingMs } from '@/domain/services/sessionRules'
import { formatCountdown, formatDurationLabel, formatMoney, formatTime } from '@/utils/format'
import PageTitle from '@/components/layout/PageTitle.vue'
import TimerDigits from '@/components/timers/TimerDigits.vue'
import CategoryIcon from '@/components/toys/CategoryIcon.vue'

const props = defineProps<{ id: string }>()
const now = useNow()
const actions = useSessionActions()
const { data: session, ready } = useLiveQuery(
  () => db.sessions.get(props.id),
  undefined as Session | undefined,
  [() => props.id],
)

const s = computed(() => session.value)
const left = computed(() => (s.value ? remainingMs(s.value, now.value) : 0))
const expired = computed(
  () => !!s.value && ((s.value.status === 'running' && left.value <= 0) || s.value.endReason === 'expired'),
)
const done = computed(() => !!s.value && (s.value.status === 'completed' || s.value.status === 'cancelled'))
const used = computed(() => (s.value ? progress(s.value, now.value) : 0))

// Anel de progresso
const R = 120
const C = 2 * Math.PI * R
const dash = computed(() => C * (1 - used.value))

const stateText = computed(() => {
  if (!s.value) return ''
  if (expired.value) return 'Tempo esgotado'
  if (s.value.status === 'completed' && s.value.endReason === 'early') return 'Finalizada antes do tempo'
  return STATUS_LABEL[s.value.status]
})
</script>

<template>
  <main class="mx-auto max-w-2xl pb-28">
    <PageTitle :title="s?.toyName ?? 'Sessão'" back="/" />

    <p v-if="ready && !s" class="px-4 text-muted">
      Esta sessão não existe mais neste aparelho.
      <RouterLink to="/" class="font-semibold text-run-ink underline underline-offset-4">Voltar à operação</RouterLink>
    </p>

    <template v-else-if="s">
      <p class="flex items-center gap-2 px-4 text-sm text-muted">
        <CategoryIcon :category="s.toyCategory" :size="18" /> {{ CATEGORY_LABEL[s.toyCategory] }}
      </p>

      <!-- Cronômetro principal -->
      <section class="mt-4 flex flex-col items-center px-4" aria-label="Tempo restante">
        <div class="relative aspect-square w-full max-w-[19rem]">
          <svg viewBox="0 0 280 280" class="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="140" cy="140" :r="R" fill="none" class="stroke-line" stroke-width="14" />
            <circle
              cx="140"
              cy="140"
              :r="R"
              fill="none"
              stroke-width="14"
              stroke-linecap="round"
              :stroke-dasharray="C"
              :stroke-dashoffset="C - dash"
              class="transition-[stroke-dashoffset] duration-300 ease-linear"
              :class="expired ? 'stroke-alerta' : s.status === 'paused' ? 'stroke-alegria' : 'stroke-parque'"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span
              class="text-timer-xl"
              :class="expired ? 'text-alerta-700 dark:text-[#F28B8B]' : s.status === 'running' ? 'text-run-ink' : 'text-ink'"
            >
              <TimerDigits :ms="left" />
            </span>
            <span class="mt-2 text-sm font-medium text-muted">de {{ formatCountdown(s.durationSec * 1000) }}</span>
          </div>
        </div>

        <p
          class="mt-3 flex items-center gap-2 text-base font-semibold"
          :class="expired ? 'text-alerta-700 dark:text-[#F28B8B]' : ''"
          role="status"
        >
          <TimerOff v-if="expired" :size="20" aria-hidden="true" />
          <Pause v-else-if="s.status === 'paused'" :size="20" aria-hidden="true" />
          {{ stateText }}
        </p>
      </section>

      <!-- Controles -->
      <div class="mt-6 grid grid-cols-2 gap-2 px-4">
        <template v-if="s.status === 'running' && !expired">
          <button type="button" class="btn-quiet min-h-[3.5rem] text-base" @click="actions.pause(s.id)">
            <Pause :size="22" aria-hidden="true" /> Pausar
          </button>
          <button type="button" class="btn-quiet min-h-[3.5rem] text-base" @click="actions.requestFinish(s)">
            <Square :size="20" aria-hidden="true" /> Finalizar
          </button>
        </template>
        <template v-else-if="s.status === 'paused'">
          <button type="button" class="btn-primary min-h-[3.5rem] text-base" @click="actions.resume(s.id)">
            <Play :size="22" fill="currentColor" aria-hidden="true" /> Continuar
          </button>
          <button type="button" class="btn-quiet min-h-[3.5rem] text-base" @click="actions.requestFinish(s)">
            <Square :size="20" aria-hidden="true" /> Finalizar
          </button>
        </template>
        <template v-else-if="done">
          <button type="button" class="btn-primary min-h-[3.5rem] text-base" @click="actions.start(s.toyId).then((n) => n && $router.replace(`/sessao/${n.id}`))">
            <RotateCcw :size="20" aria-hidden="true" /> Nova volta
          </button>
          <button
            v-if="!s.alertDismissed"
            type="button"
            class="btn-quiet min-h-[3.5rem] text-base"
            @click="actions.dismiss(s.id)"
          >
            <BellOff :size="20" aria-hidden="true" /> Dispensar
          </button>
          <RouterLink v-else to="/" class="btn-quiet min-h-[3.5rem] text-base">Voltar à operação</RouterLink>
        </template>
      </div>

      <!-- Dados da sessão -->
      <dl class="mx-4 mt-8 divide-y divide-line border-y border-line text-base">
        <div class="flex justify-between py-3">
          <dt class="text-muted">Valor da sessão</dt>
          <dd class="tabular font-semibold" :class="s.status === 'cancelled' ? 'line-through opacity-70' : ''">
            {{ formatMoney(s.priceCents) }}
          </dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-muted">Duração original</dt>
          <dd class="font-medium">{{ formatDurationLabel(s.durationSec) }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-muted">Início</dt>
          <dd class="tabular font-medium">{{ formatTime(s.startedAt) }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-muted">{{ s.endedAt ? 'Término' : 'Término previsto' }}</dt>
          <dd class="tabular font-medium">
            {{ s.endedAt ? formatTime(s.endedAt) : s.expectedEndAt ? formatTime(s.expectedEndAt) : 'em pausa' }}
          </dd>
        </div>
        <div v-if="s.consumedSec !== null" class="flex justify-between py-3">
          <dt class="text-muted">Tempo usado</dt>
          <dd class="font-medium">{{ formatDurationLabel(s.consumedSec) }}</dd>
        </div>
        <div v-if="s.endNote" class="flex justify-between gap-4 py-3">
          <dt class="text-muted">Motivo</dt>
          <dd class="text-right font-medium">{{ s.endNote }}</dd>
        </div>
      </dl>
    </template>
  </main>
</template>
