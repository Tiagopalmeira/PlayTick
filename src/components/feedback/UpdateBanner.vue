<script setup lang="ts">
/**
 * Atualização do PWA sob controle do operador. A nova versão só é ativada quando ele toca em
 * "Atualizar agora". Sessões em andamento não são afetadas: o tempo vem do banco, não da memória.
 */
import { RefreshCw } from 'lucide-vue-next'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    // Procura novas versões a cada hora, quando houver internet.
    if (reg) setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000)
  },
})
</script>

<template>
  <div
    v-if="needRefresh"
    class="mx-auto mt-3 flex max-w-2xl items-center gap-3 rounded-control border border-parque/50 bg-run-bg px-4 py-2.5 text-sm"
    role="status"
  >
    <RefreshCw :size="20" class="shrink-0 text-run-ink" aria-hidden="true" />
    <p class="flex-1">Nova versão disponível. Os cronômetros continuam de onde estão.</p>
    <button type="button" class="btn-primary min-h-[2.75rem] px-3 text-sm" @click="updateServiceWorker(true)">
      Atualizar agora
    </button>
  </div>
  <div
    v-else-if="offlineReady"
    class="mx-auto mt-3 flex max-w-2xl items-center gap-3 rounded-control border border-line bg-surface px-4 py-2.5 text-sm"
    role="status"
  >
    <p class="flex-1">Pronto para funcionar sem internet.</p>
    <button type="button" class="btn-ghost min-h-[2.75rem] px-3 text-sm" @click="offlineReady = false">Ok</button>
  </div>
</template>
