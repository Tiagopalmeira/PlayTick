<script setup lang="ts">
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-vue-next'
import { dismissToast, useToasts } from '@/composables/useToast'

const toasts = useToasts()
const icon = { info: Info, success: CircleCheck, error: TriangleAlert }
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
    style="bottom: calc(4.75rem + env(safe-area-inset-bottom))"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-control py-2 pl-4 pr-1 text-sm font-medium shadow-lg"
        :class="t.kind === 'error' ? 'bg-alerta-700 text-white' : 'bg-carvao text-white ring-1 ring-white/10'"
      >
        <component
          :is="icon[t.kind]"
          :size="20"
          :stroke-width="2"
          :class="t.kind === 'success' ? 'text-parque' : ''"
          aria-hidden="true"
        />
        <span class="flex-1">{{ t.text }}</span>
        <button type="button" class="icon-btn text-white/80" aria-label="Fechar aviso" @click="dismissToast(t.id)">
          <X :size="18" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
