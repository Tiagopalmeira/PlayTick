<script setup lang="ts">
/**
 * Uma "pista" do quadro de operação: um brinquedo, seu estado e os controles.
 * Estado comunicado por texto + ícone + cor (nunca só cor).
 */
import { computed } from 'vue'
import { BellOff, Pause, Play, RotateCcw, Square, TimerOff } from 'lucide-vue-next'
import type { Lane } from '@/composables/useBoard'
import { useSessionActions } from '@/composables/useSessionActions'
import { CATEGORY_LABEL } from '@/domain/models'
import { formatDurationLabel, formatMoney, formatTime } from '@/utils/format'
import CategoryIcon from '@/components/toys/CategoryIcon.vue'
import TimerDigits from './TimerDigits.vue'

const props = defineProps<{ lane: Lane }>()
const actions = useSessionActions()

const s = computed(() => props.lane.session)
const consumed = computed(() => {
  const total = (s.value?.durationSec ?? props.lane.toy.durationSec) * 1000
  return props.lane.state === 'idle' ? 0 : Math.min(1, Math.max(0, 1 - props.lane.remaining / total))
})
const endedAt = computed(() => s.value?.endedAt ?? s.value?.expectedEndAt ?? null)
const busy = computed(() => props.lane.state !== 'idle')

const tone = computed(
  () =>
    ({
      idle: 'bg-surface border-line',
      running: 'bg-run-bg border-parque/50',
      paused: 'bg-pause-bg border-alegria/60',
      expired: 'bg-alerta-700 border-alerta-700 text-white',
    })[props.lane.state],
)
</script>

<template>
  <article
    class="relative overflow-hidden rounded-lane border"
    :class="[tone, lane.state === 'expired' ? 'lane-expired' : '']"
    :aria-label="`${lane.toy.name}`"
  >
    <div class="flex items-start gap-3 px-4 pb-3 pt-3.5">
      <div class="min-w-0 flex-1">
        <h2 class="flex items-center gap-2 text-base leading-snug">
          <CategoryIcon :category="lane.toy.category" :size="20" class="shrink-0 opacity-80" />
          <span class="truncate">{{ lane.toy.name }}</span>
        </h2>

        <!-- Linha de estado: texto + ícone -->
        <p v-if="lane.state === 'idle'" class="mt-0.5 text-sm text-muted">
          {{ CATEGORY_LABEL[lane.toy.category] }}, {{ formatDurationLabel(lane.toy.durationSec) }},
          <span class="tabular">{{ formatMoney(lane.toy.priceCents) }}</span>
        </p>
        <p v-else-if="lane.state === 'running'" class="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-run-ink">
          <span class="live-dot" aria-hidden="true" />
          Em andamento, até {{ endedAt ? formatTime(endedAt) : '' }}
        </p>
        <p v-else-if="lane.state === 'paused'" class="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
          <Pause :size="16" :stroke-width="2.25" aria-hidden="true" /> Pausada
        </p>
        <p v-else class="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
          <TimerOff :size="17" :stroke-width="2.25" aria-hidden="true" />
          Tempo esgotado{{ endedAt ? ` às ${formatTime(endedAt)}` : '' }}
        </p>
        <p v-if="busy && s" class="tabular mt-0.5 text-xs font-medium" :class="lane.state === 'expired' ? 'text-white/85' : 'text-muted'">
          {{ formatDurationLabel(s.durationSec) }} por {{ formatMoney(s.priceCents) }}
        </p>
      </div>

      <RouterLink
        v-if="s && busy"
        :to="`/sessao/${s.id}`"
        class="-mr-1 shrink-0 rounded-control px-1 text-timer"
        :class="{ 'text-run-ink': lane.state === 'running', 'text-ink/70': lane.state === 'paused' }"
        :aria-label="`Abrir sessão de ${lane.toy.name}`"
      >
        <TimerDigits :ms="lane.remaining" />
      </RouterLink>
    </div>

    <!-- Controles -->
    <div class="flex gap-2 px-4 pb-4">
      <template v-if="lane.state === 'idle'">
        <button type="button" class="btn-primary flex-1 text-base" @click="actions.start(lane.toy.id)">
          <Play :size="20" :stroke-width="2.25" fill="currentColor" aria-hidden="true" /> Iniciar
          <span class="sr-only">{{ lane.toy.name }}</span>
        </button>
      </template>

      <template v-else-if="lane.state === 'running' && s">
        <button type="button" class="btn-quiet flex-1" @click="actions.pause(s.id)">
          <Pause :size="20" :stroke-width="2.25" aria-hidden="true" /> Pausar
        </button>
        <button type="button" class="btn-quiet flex-1" @click="actions.requestFinish(s)">
          <Square :size="18" :stroke-width="2.25" aria-hidden="true" /> Finalizar
        </button>
      </template>

      <template v-else-if="lane.state === 'paused' && s">
        <button type="button" class="btn-primary flex-1" @click="actions.resume(s.id)">
          <Play :size="20" :stroke-width="2.25" fill="currentColor" aria-hidden="true" /> Continuar
        </button>
        <button type="button" class="btn-quiet flex-1" @click="actions.requestFinish(s)">
          <Square :size="18" :stroke-width="2.25" aria-hidden="true" /> Finalizar
        </button>
      </template>

      <template v-else-if="s">
        <button type="button" class="btn flex-1 bg-white text-carvao hover:bg-white/90" @click="actions.start(lane.toy.id)">
          <RotateCcw :size="20" :stroke-width="2.25" aria-hidden="true" /> Nova volta
        </button>
        <button type="button" class="btn flex-1 border border-white/70 text-white hover:bg-white/10" @click="actions.dismiss(s.id)">
          <BellOff :size="19" :stroke-width="2.25" aria-hidden="true" /> Dispensar
        </button>
      </template>
    </div>

    <!-- Barra de progresso: esvazia conforme o tempo passa -->
    <div
      v-if="lane.state === 'running' || lane.state === 'paused'"
      class="absolute inset-x-0 bottom-0 h-1.5 bg-ink/10"
      role="progressbar"
      :aria-valuenow="Math.round(consumed * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Tempo usado de ${lane.toy.name}`"
    >
      <div
        class="h-full origin-right transition-transform duration-300 ease-linear"
        :class="lane.state === 'running' ? 'bg-parque' : 'bg-alegria'"
        :style="{ transform: `scaleX(${1 - consumed})` }"
      />
    </div>
  </article>
</template>

<style scoped>
.live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: currentColor;
  animation: live 1.6s ease-in-out infinite;
}
@keyframes live {
  50% {
    opacity: 0.35;
  }
}
/* Um único pulso ao esgotar: chama a atenção sem ficar piscando. */
.lane-expired {
  animation: expired-in 0.9s ease-out 1;
}
@keyframes expired-in {
  0% {
    box-shadow: 0 0 0 0 rgb(220 69 69 / 0.7);
  }
  100% {
    box-shadow: 0 0 0 14px rgb(220 69 69 / 0);
  }
}
</style>
