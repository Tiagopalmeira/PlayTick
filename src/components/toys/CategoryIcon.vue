<script setup lang="ts">
import { computed } from 'vue'
import { Bike, Castle, FerrisWheel } from 'lucide-vue-next'
import type { ToyCategory } from '@/domain/models'

const props = withDefaults(defineProps<{ category: ToyCategory; size?: number }>(), { size: 22 })
const icon = computed(() => ({ motinha: Bike, 'pula-pula': Castle, outro: FerrisWheel })[props.category])
</script>

<template>
  <component :is="icon" :size="size" :stroke-width="1.75" aria-hidden="true" />
</template>
