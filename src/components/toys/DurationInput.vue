<script setup lang="ts">
/** Duração em minutos e segundos, com atalhos para as durações mais comuns. */
import { computed } from 'vue'

const model = defineModel<number>({ required: true })
const QUICK = [3, 5, 10, 15, 20, 30]

const minutes = computed({
  get: () => Math.floor(model.value / 60),
  set: (m: number) => (model.value = clampInt(m, 0, 240) * 60 + seconds.value),
})
const seconds = computed({
  get: () => model.value % 60,
  set: (s: number) => (model.value = minutes.value * 60 + clampInt(s, 0, 59)),
})

function clampInt(v: number, min: number, max: number) {
  const n = Math.trunc(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}
</script>

<template>
  <fieldset>
    <legend class="field-label">Duração da volta</legend>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="m in QUICK"
        :key="m"
        type="button"
        class="min-h-touch min-w-[3.75rem] rounded-control border px-3 font-medium transition-colors"
        :class="model === m * 60 ? 'border-parque bg-parque text-carvao' : 'border-line bg-surface text-ink'"
        :aria-pressed="model === m * 60"
        @click="model = m * 60"
      >
        {{ m }} min
      </button>
    </div>
    <div class="mt-3 flex items-end gap-3">
      <label class="w-28">
        <span class="mb-1 block text-sm text-muted">Minutos</span>
        <input v-model.number="minutes" type="number" inputmode="numeric" min="0" max="240" class="field tabular" />
      </label>
      <span class="pb-3 text-xl font-semibold text-muted" aria-hidden="true">:</span>
      <label class="w-28">
        <span class="mb-1 block text-sm text-muted">Segundos</span>
        <input v-model.number="seconds" type="number" inputmode="numeric" min="0" max="59" class="field tabular" />
      </label>
    </div>
  </fieldset>
</template>
