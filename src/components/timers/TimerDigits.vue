<script setup lang="ts">
/**
 * Cronômetro com largura estável: cada dígito ocupa uma caixa fixa, então "11:11" e "08:08"
 * têm exatamente a mesma largura e o número não "pula" a cada segundo.
 */
import { computed } from 'vue'
import { formatCountdown } from '@/utils/format'

const props = defineProps<{ ms: number }>()
const chars = computed(() => formatCountdown(props.ms).split(''))
</script>

<template>
  <span class="tabular inline-flex font-semibold leading-none tracking-tight" role="timer" :aria-label="formatCountdown(ms)">
    <span
      v-for="(c, i) in chars"
      :key="i"
      aria-hidden="true"
      class="inline-block text-center"
      :class="c === ':' ? 'w-[0.32em] -translate-y-[0.06em]' : 'w-[0.62em]'"
      >{{ c }}</span
    >
  </span>
</template>
