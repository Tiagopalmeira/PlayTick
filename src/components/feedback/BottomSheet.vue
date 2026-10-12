<script setup lang="ts">
/** Folha inferior modal, alcançável com o polegar. Fecha com Esc, toque fora ou botão. */
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
let lastFocus: HTMLElement | null = null

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocus = document.activeElement as HTMLElement | null
      await nextTick()
      panel.value?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
    } else lastFocus?.focus?.()
  },
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')]
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center" @keydown="onKey">
        <div class="absolute inset-0 bg-carvao/60" aria-hidden="true" @click="emit('close')" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="sheet-panel relative w-full max-w-lg rounded-t-[20px] bg-surface px-5 pb-6 pt-3 text-ink"
          style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom))"
        >
          <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          <h2 class="text-lg">{{ title }}</h2>
          <div class="mt-2">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.16s ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(24px);
}
</style>
