<script setup lang="ts">
/** Folha de finalização antecipada: evita encerramentos acidentais e registra o motivo. */
import { computed, ref, watch } from 'vue'
import { Ban, Check } from 'lucide-vue-next'
import { useFinishSheet, useSessionActions } from '@/composables/useSessionActions'
import { useNow } from '@/composables/useTimerEngine'
import { remainingMs } from '@/domain/services/sessionRules'
import { formatCountdown, formatMoney } from '@/utils/format'
import BottomSheet from '@/components/feedback/BottomSheet.vue'

const session = useFinishSheet()
const actions = useSessionActions()
const now = useNow()

const REASONS = ['Criança quis descer', 'Responsável pediu', 'Problema no brinquedo', 'Troca de brinquedo']
const reason = ref<string | null>(null)
watch(session, () => (reason.value = null))

const left = computed(() => (session.value ? formatCountdown(remainingMs(session.value, now.value)) : ''))
const close = () => (session.value = null)
</script>

<template>
  <BottomSheet :open="!!session" :title="session ? `Finalizar ${session.toyName}?` : ''" @close="close">
    <template v-if="session">
      <p class="text-muted">
        Ainda faltam <strong class="tabular font-semibold text-ink">{{ left }}</strong>.
      </p>

      <fieldset class="mt-4">
        <legend class="field-label">Motivo (opcional)</legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="r in REASONS"
            :key="r"
            type="button"
            class="min-h-[2.75rem] rounded-full border px-3.5 text-sm font-medium transition-colors"
            :class="reason === r ? 'border-ink bg-ink text-page' : 'border-line bg-surface text-ink'"
            :aria-pressed="reason === r"
            @click="reason = reason === r ? null : r"
          >
            {{ r }}
          </button>
        </div>
      </fieldset>

      <div class="mt-6 grid gap-2">
        <button type="button" class="btn-primary w-full" @click="actions.finish(session.id, 'early', reason)">
          <Check :size="20" :stroke-width="2.5" aria-hidden="true" />
          Finalizar e cobrar {{ formatMoney(session.priceCents) }}
        </button>
        <button type="button" class="btn w-full border border-alerta-700/60 text-alerta-700 dark:border-alerta dark:text-[#F28B8B]" @click="actions.finish(session.id, 'cancelled', reason)">
          <Ban :size="19" :stroke-width="2.25" aria-hidden="true" />
          Cancelar sem cobrança
        </button>
        <button type="button" class="btn-ghost w-full" @click="close">Voltar</button>
      </div>
    </template>
  </BottomSheet>
</template>
