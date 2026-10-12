<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirmState } from '@/composables/useConfirm'
import BottomSheet from './BottomSheet.vue'

const { pending, settle } = useConfirmState()
const typed = ref('')
watch(pending, () => (typed.value = ''))
const canConfirm = computed(() => !pending.value?.requireText || typed.value.trim().toUpperCase() === pending.value.requireText)
</script>

<template>
  <BottomSheet :open="!!pending" :title="pending?.title ?? ''" @close="settle(false)">
    <template v-if="pending">
      <p v-if="pending.message" class="text-muted">{{ pending.message }}</p>
      <label v-if="pending.requireText" class="mt-4 block">
        <span class="field-label">Digite {{ pending.requireText }} para confirmar</span>
        <input v-model="typed" class="field" autocomplete="off" autocapitalize="characters" spellcheck="false" />
      </label>
      <div class="mt-6 grid gap-2">
        <button
          type="button"
          :class="pending.danger ? 'btn-danger' : 'btn-primary'"
          class="w-full"
          :disabled="!canConfirm"
          @click="settle(true)"
        >
          {{ pending.confirmLabel }}
        </button>
        <button type="button" class="btn-ghost w-full" @click="settle(false)">{{ pending.cancelLabel ?? 'Voltar' }}</button>
      </div>
    </template>
  </BottomSheet>
</template>
