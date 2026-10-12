<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Settings } from 'lucide-vue-next'
import BrandLogo from '@/components/brand/BrandLogo.vue'
import { useNow } from '@/composables/useTimerEngine'
import { useTodaySummary } from '@/composables/useTodaySummary'
import { formatLongDate, formatMoney } from '@/utils/format'

const now = useNow()
const { summary } = useTodaySummary()
const date = computed(() => {
  const s = formatLongDate(now.value)
  return s.charAt(0).toUpperCase() + s.slice(1)
})

// Expõe a altura do cabeçalho fixo para outros elementos "sticky" pararem logo abaixo dele.
const el = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!el.value) return
  observer = new ResizeObserver(([entry]) => {
    const h = entry?.borderBoxSize?.[0]?.blockSize ?? el.value?.offsetHeight ?? 0
    document.documentElement.style.setProperty('--header-h', `${Math.round(h)}px`)
  })
  observer.observe(el.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <header ref="el" class="sticky top-0 z-30 border-b border-white/10 bg-carvao text-white" style="padding-top: env(safe-area-inset-top)">
    <div class="mx-auto flex max-w-2xl items-center justify-between px-4 pt-2">
      <RouterLink to="/" class="-ml-1 rounded-control p-1" aria-label="ParquiTime, ir para a operação">
        <BrandLogo />
      </RouterLink>
      <RouterLink to="/ajustes" class="icon-btn -mr-2 text-white/90 hover:bg-white/10" aria-label="Configurações">
        <Settings :size="24" :stroke-width="1.75" />
      </RouterLink>
    </div>
    <div class="mx-auto flex max-w-2xl items-end justify-between gap-3 px-4 pb-3 pt-1">
      <p class="text-sm text-white/75">{{ date }}</p>
      <RouterLink
        to="/historico"
        class="text-right leading-tight"
        :aria-label="`Hoje: ${formatMoney(summary.netCents)} em ${summary.completedCount} sessões concluídas. Ver histórico.`"
      >
        <span class="tabular block text-lg font-semibold text-alegria">{{ formatMoney(summary.netCents) }}</span>
        <span class="text-xs font-medium text-white/70">
          hoje, {{ summary.completedCount }} {{ summary.completedCount === 1 ? 'sessão' : 'sessões' }}
        </span>
      </RouterLink>
    </div>
  </header>
</template>
