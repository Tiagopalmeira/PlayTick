<script setup lang="ts">
import { computed, ref } from 'vue'
import { HardDrive } from 'lucide-vue-next'
import { useSettings } from '@/composables/useSettings'
import { useNow } from '@/composables/useTimerEngine'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db } from '@/composables/services'
import { exportBackup } from '@/composables/useDataTransfer'

const { settings, ready } = useSettings()
const now = useNow()
const hidden = ref(false)
const { data: sessionCount } = useLiveQuery(() => db.sessions.count(), 0)

const due = computed(() => {
  const days = settings.value.backupReminderDays
  if (!ready.value || hidden.value || days === 0 || sessionCount.value === 0) return false
  const last = settings.value.lastExportAt
  return last === null || now.value - last > days * 24 * 3600 * 1000
})
</script>

<template>
  <div
    v-if="due"
    class="mx-auto mt-3 flex max-w-2xl items-start gap-3 rounded-control border border-alegria/60 bg-pause-bg px-4 py-3 text-sm"
    role="status"
  >
    <HardDrive :size="20" class="mt-0.5 shrink-0" aria-hidden="true" />
    <div class="flex-1">
      <p>
        Os dados ficam só neste celular. Salve uma cópia de segurança
        {{ settings.lastExportAt === null ? 'pela primeira vez' : 'atualizada' }}.
      </p>
      <div class="mt-2 flex gap-2">
        <button type="button" class="btn-quiet min-h-[2.75rem] px-3 text-sm" @click="exportBackup()">Salvar cópia</button>
        <button type="button" class="btn-ghost min-h-[2.75rem] px-3 text-sm" @click="hidden = true">Agora não</button>
      </div>
    </div>
  </div>
</template>
