<script setup lang="ts">
import { History, LayoutList, Timer } from 'lucide-vue-next'

const items = [
  { to: '/', label: 'Operação', icon: Timer, exact: true },
  { to: '/brinquedos', label: 'Brinquedos', icon: LayoutList, exact: false },
  { to: '/historico', label: 'Histórico', icon: History, exact: false },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 bg-carvao text-white"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Navegação principal"
  >
    <ul class="mx-auto grid max-w-2xl grid-cols-3">
      <li v-for="item in items" :key="item.to">
        <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" :to="item.to" custom>
          <a
            :href="href"
            class="relative flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium"
            :class="(item.exact ? isExactActive : isActive) ? 'text-white' : 'text-white/60'"
            :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
            @click="navigate"
          >
            <span
              v-if="item.exact ? isExactActive : isActive"
              class="absolute inset-x-6 top-0 h-[3px] rounded-b bg-parque"
              aria-hidden="true"
            />
            <component :is="item.icon" :size="24" :stroke-width="1.75" />
            {{ item.label }}
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
