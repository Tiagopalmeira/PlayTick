<script setup lang="ts">
/** Símbolo ParquiTime. Os traços de velocidade e o ponteiro usam currentColor para funcionar em qualquer fundo. */
defineProps<{ size?: number }>()
</script>

<template>
  <svg
    :width="size ?? 32"
    :height="size ?? 32"
    viewBox="-4 0 104 100"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="43" y="7" width="14" height="7" rx="2.5" fill="#F59E0B" />
    <rect x="47.5" y="13" width="5" height="9" fill="#F59E0B" />
    <rect x="74" y="20" width="7" height="11" rx="2" transform="rotate(45 77.5 25.5)" fill="#F59E0B" />
    <path d="M22.29 40 A32 32 0 1 1 39.06 86.07" stroke="#F59E0B" stroke-width="9" />
    <path d="M50 56 L62.9 40.7" stroke="currentColor" stroke-width="7" />
    <circle cx="50" cy="56" r="6" fill="#F59E0B" />
    <path d="M4 50 H17 M-2 62.5 H15 M9 75 H25" stroke="currentColor" stroke-width="6.5" />
  </svg>
</template>
