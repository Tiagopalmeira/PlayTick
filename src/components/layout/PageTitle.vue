<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = defineProps<{ title: string; back?: string }>()
const router = useRouter()

function goBack() {
  if (window.history.state?.back) router.back()
  else void router.push(props.back ?? '/')
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl items-center gap-1 px-4 pb-2 pt-4">
    <button v-if="back" type="button" class="icon-btn -ml-3 text-ink" aria-label="Voltar" @click="goBack">
      <ChevronLeft :size="26" :stroke-width="2" />
    </button>
    <h1 class="min-w-0 flex-1 truncate text-xl">{{ title }}</h1>
    <slot name="action" />
  </div>
</template>
