<script setup lang="ts">
import { watchEffect } from 'vue'
import { startTimerEngine } from '@/composables/useTimerEngine'
import { useSettings } from '@/composables/useSettings'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db } from '@/composables/services'
import { setWakeLock } from '@/platform/wakeLock'
import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import FinishSheet from '@/components/timers/FinishSheet.vue'
import ConfirmHost from '@/components/feedback/ConfirmHost.vue'
import ToastHost from '@/components/feedback/ToastHost.vue'

const { settings, ready } = useSettings()
startTimerEngine()

const { data: runningCount } = useLiveQuery(() => db.sessions.where('status').equals('running').count(), 0)
watchEffect(() => {
  if (ready.value) void setWakeLock(settings.value.keepScreenOn && runningCount.value > 0)
})
</script>

<template>
  <a href="#conteudo" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-surface focus:p-2">
    Ir para o conteúdo
  </a>
  <AppHeader />
  <div id="conteudo">
    <RouterView v-slot="{ Component }">
      <KeepAlive include="OperationView">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
  <BottomNav />
  <FinishSheet />
  <ConfirmHost />
  <ToastHost />
</template>
