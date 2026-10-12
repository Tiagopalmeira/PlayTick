<script setup lang="ts">
import { computed } from 'vue'
import { BellOff, Plus, Volume2 } from 'lucide-vue-next'
import { useBoard } from '@/composables/useBoard'
import { useSettings } from '@/composables/useSettings'
import { useAudioReady } from '@/composables/useTimerEngine'
import { clock, db, timerService } from '@/composables/services'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { toast, toastError } from '@/composables/useToast'
import { addDemoToys, removeDemoData } from '@/db/demo'
import { confirmAction } from '@/composables/useConfirm'
import ToyLane from '@/components/timers/ToyLane.vue'
import BrandSymbol from '@/components/brand/BrandSymbol.vue'
import UpdateBanner from '@/components/feedback/UpdateBanner.vue'
import BackupReminder from '@/components/feedback/BackupReminder.vue'

defineOptions({ name: 'OperationView' })

const { toys, lanes, counts, ready, error } = useBoard()
const { settings } = useSettings()
const audioReady = useAudioReady()
const { data: demoCount } = useLiveQuery(() => db.toys.filter((t) => t.isDemo).count(), 0)

const hasToys = computed(() => toys.value.length > 0)
const needsAudioTap = computed(() => settings.value.soundEnabled && !audioReady.value && counts.value.running > 0)

async function useExamples() {
  try {
    await addDemoToys(db, clock)
    toast('Brinquedos de exemplo adicionados', 'success')
  } catch (e) {
    toastError(e)
  }
}

async function removeExamples() {
  const ok = await confirmAction({
    title: 'Remover dados de exemplo?',
    message: 'Os brinquedos de exemplo e todas as sessões feitas neles saem do aparelho. Seus brinquedos não são afetados.',
    confirmLabel: 'Remover exemplos',
    danger: true,
  })
  if (!ok) return
  await removeDemoData(db)
  await timerService.reconcile()
  toast('Dados de exemplo removidos', 'info')
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 pb-28">
    <UpdateBanner />
    <!-- Lembrete de cópia só com o quadro parado, para não empurrar cronômetros ativos -->
    <BackupReminder v-if="counts.running + counts.paused + counts.expired === 0" />

    <!-- Alerta fixo enquanto houver tempos esgotados -->
    <div
      v-if="counts.expired > 0"
      class="sticky top-0 z-20 -mx-4 mt-3 flex items-center gap-3 bg-alerta-700 px-4 py-2 text-white"
      role="alert"
    >
      <p class="flex-1 text-sm font-semibold">
        {{ counts.expired === 1 ? '1 brinquedo com tempo esgotado' : `${counts.expired} brinquedos com tempo esgotado` }}
      </p>
      <button type="button" class="btn min-h-[2.75rem] border border-white/70 px-3 text-sm" @click="timerService.dismissAllAlerts()">
        <BellOff :size="18" aria-hidden="true" /> Dispensar todos
      </button>
    </div>

    <p
      v-if="needsAudioTap"
      class="mt-3 flex items-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-sm"
      role="status"
    >
      <Volume2 :size="20" class="shrink-0 text-run-ink" aria-hidden="true" />
      Toque em qualquer lugar da tela para ativar o som dos alertas.
    </p>

    <p v-if="error" class="mt-6 rounded-control bg-done-bg p-4 text-sm" role="alert">
      Não foi possível ler os dados do aparelho: {{ error }}. Feche e abra o app de novo.
    </p>

    <!-- Primeiro uso -->
    <section v-else-if="ready && !hasToys" class="flex flex-col items-start pt-10">
      <BrandSymbol :size="72" class="text-ink" />
      <h1 class="mt-5 text-xl">Cadastre o primeiro brinquedo</h1>
      <p class="mt-2 max-w-[34ch] text-muted">
        Informe o nome, quanto tempo dura uma volta e o preço. Depois é só tocar em Iniciar a cada cliente.
      </p>
      <div class="mt-6 flex w-full flex-col gap-2 sm:flex-row">
        <RouterLink to="/brinquedos/novo" class="btn-primary flex-1">
          <Plus :size="20" :stroke-width="2.5" aria-hidden="true" /> Cadastrar brinquedo
        </RouterLink>
        <button type="button" class="btn-quiet flex-1" @click="useExamples">Ver com exemplos</button>
      </div>
    </section>

    <template v-else-if="ready">
      <p v-if="demoCount > 0" class="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
        Usando brinquedos de exemplo.
        <button type="button" class="min-h-[2.75rem] shrink-0 px-1 font-semibold text-ink underline underline-offset-4" @click="removeExamples">
          Remover exemplos
        </button>
      </p>

      <p v-if="lanes.length === 0" class="mt-8 text-muted">
        Todos os brinquedos estão desativados.
        <RouterLink to="/brinquedos" class="font-semibold text-run-ink underline underline-offset-4">Ativar em Brinquedos</RouterLink>
      </p>

      <h1 class="sr-only">Operação</h1>
      <ul class="mt-4 flex flex-col gap-3" aria-label="Brinquedos">
        <li v-for="lane in lanes" :key="lane.toy.id">
          <ToyLane :lane="lane" />
        </li>
      </ul>

      <RouterLink to="/brinquedos/novo" class="btn-quiet mt-5 w-full">
        <Plus :size="20" :stroke-width="2.5" aria-hidden="true" /> Adicionar brinquedo
      </RouterLink>
    </template>
  </main>
</template>
