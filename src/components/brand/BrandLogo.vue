<script setup lang="ts">
import BrandSymbol from './BrandSymbol.vue'

withDefaults(defineProps<{ size?: 'sm' | 'lg' }>(), { size: 'sm' })
</script>

<template>
  <span class="inline-flex items-center gap-2" :class="size === 'lg' ? 'gap-3' : 'gap-2'">
    <BrandSymbol :size="size === 'lg' ? 56 : 30" />
    <span
      class="font-semibold leading-none tracking-[-0.01em]"
      :class="size === 'lg' ? 'text-[2rem]' : 'text-[1.1875rem]'"
      >Parqui<span class="text-alegria">Time</span></span
    >
  </span>
</template>
