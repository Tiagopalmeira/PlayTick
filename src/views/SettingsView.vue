<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, FileSpreadsheet, Trash2, Upload, Volume2 } from 'lucide-vue-next'
import { useSettings } from '@/composables/useSettings'
import { APP_VERSION, clock, db, timerService } from '@/composables/services'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { exportAllCsv, exportBackup, importBackup, wipeEverything } from '@/composables/useDataTransfer'
import { confirmAction } from '@/composables/useConfirm'
import { toast } from '@/composables/useToast'
import { addDemoToys, removeDemoData } from '@/db/demo'
import type { EarlyEndBehavior, ThemePreference } from '@/domain/models'
import { canVibrate, playExpiredAlert, unlockAudio, vibrateExpired } from '@/platform/alertSound'
import { formatBytes, getStorageInfo, requestPersistence, type StorageInfo } from '@/platform/storage'
import { wakeLockSupported } from '@/platform/wakeLock'
import PageTitle from '@/components/layout/PageTitle.vue'
import BrandLogo from '@/components/brand/BrandLogo.vue'

const { settings, update } = useSettings()
const storage = ref<StorageInfo | null>(null)
const { data: demoCount } = useLiveQuery(() => db.toys.filter((t) => t.isDemo).count(), 0)
const { data: counts } = useLiveQuery(
  async () => ({ toys: await db.toys.count(), sessions: await db.sessions.count() }),
  { toys: 0, sessions: 0 },
)

async function refreshStorage() {
  storage.value = await getStorageInfo()
}
onMounted(refreshStorage)

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
  { value: 'sistema', label: 'Do celular' },
]
const EARLY: { value: EarlyEndBehavior; label: string; hint: string }[] = [
  { value: 'perguntar', label: 'Perguntar', hint: 'Escolher entre cobrar ou cancelar e anotar o motivo.' },
  { value: 'cobrar', label: 'Cobrar direto', hint: 'Finaliza na hora com o valor integral. Menos toques.' },
]
const REMINDER = [
  { value: 1, label: 'Todo dia' },
  { value: 7, label: 'Toda semana' },
  { value: 30, label: 'Todo mês' },
  { value: 0, label: 'Nunca' },
]

const volumePct = computed({
  get: () => Math.round(settings.value.alertVolume * 100),
  set: (v: number) => void update({ alertVolume: v / 100 }),
})

function testSound() {
  unlockAudio()
  playExpiredAlert(settings.value.alertVolume)
  if (settings.value.vibrationEnabled) vibrateExpired()
}

const lastExport = computed(() =>
  settings.value.lastExportAt
    ? new Date(settings.value.lastExportAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })
    : 'nunca',
)

async function protect() {
  const ok = await requestPersistence()
  await refreshStorage()
  toast(ok ? 'Armazenamento protegido' : 'O navegador não liberou a proteção agora. Instale o app na tela inicial e tente de novo.', ok ? 'success' : 'info', 5000)
}

async function toggleDemo() {
  if (demoCount.value > 0) {
    const ok = await confirmAction({
      title: 'Remover dados de exemplo?',
      message: 'Os brinquedos de exemplo e as sessões feitas neles saem do aparelho. Seus brinquedos não são afetados.',
      confirmLabel: 'Remover exemplos',
      danger: true,
    })
    if (!ok) return
    await removeDemoData(db)
    await timerService.reconcile()
    toast('Dados de exemplo removidos', 'info')
  } else {
    await addDemoToys(db, clock)
    toast('Brinquedos de exemplo adicionados', 'success')
  }
}

async function wipe() {
  if (await wipeEverything()) await refreshStorage()
}
</script>

<template>
  <main class="mx-auto max-w-2xl pb-28">
    <PageTitle title="Configurações" back="/" />

    <!-- Alertas -->
    <section class="mt-2 px-4" aria-labelledby="s-alertas">
      <h2 id="s-alertas" class="mb-1 text-base">Alertas de tempo esgotado</h2>
      <div class="divide-y divide-line border-y border-line">
        <label class="flex min-h-[3.5rem] cursor-pointer items-center justify-between gap-4 py-2">
          <span>Som</span>
          <input type="checkbox" class="peer sr-only" :checked="settings.soundEnabled" @change="update({ soundEnabled: !settings.soundEnabled })" />
          <span class="toggle" aria-hidden="true"><span :class="settings.soundEnabled ? 'translate-x-5' : ''" /></span>
        </label>
        <div v-if="settings.soundEnabled" class="py-3">
          <label for="volume" class="flex justify-between text-sm">
            <span>Volume</span><span class="tabular text-muted">{{ volumePct }}%</span>
          </label>
          <input id="volume" v-model.number="volumePct" type="range" min="10" max="100" step="10" class="mt-2 w-full accent-[#0EA5A0]" />
          <button type="button" class="btn-quiet mt-3 min-h-[2.75rem] text-sm" @click="testSound">
            <Volume2 :size="18" aria-hidden="true" /> Testar alerta
          </button>
        </div>
        <label class="flex min-h-[3.5rem] cursor-pointer items-center justify-between gap-4 py-2" :class="canVibrate() ? '' : 'opacity-60'">
          <span>
            <span class="block">Vibração</span>
            <span v-if="!canVibrate()" class="block text-sm text-muted">Este navegador não permite vibrar.</span>
          </span>
          <input
            type="checkbox"
            class="peer sr-only"
            :disabled="!canVibrate()"
            :checked="settings.vibrationEnabled"
            @change="update({ vibrationEnabled: !settings.vibrationEnabled })"
          />
          <span class="toggle" aria-hidden="true"><span :class="settings.vibrationEnabled ? 'translate-x-5' : ''" /></span>
        </label>
      </div>
      <p class="mt-2 text-sm text-muted">
        Com a tela bloqueada, o celular pode atrasar o alerta. O tempo continua certo e o alerta toca assim que o app voltar
        à tela.
      </p>
    </section>

    <!-- Operação -->
    <section class="mt-8 px-4" aria-labelledby="s-op">
      <h2 id="s-op" class="mb-2 text-base">Operação</h2>
      <fieldset>
        <legend class="mb-2 text-sm text-muted">Ao finalizar antes do tempo</legend>
        <div class="grid gap-2">
          <label
            v-for="o in EARLY"
            :key="o.value"
            class="flex cursor-pointer items-start gap-3 rounded-control border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-alegria"
            :class="settings.earlyEndBehavior === o.value ? 'border-parque bg-run-bg' : 'border-line bg-surface'"
          >
            <input
              type="radio"
              name="early"
              class="mt-1 accent-[#0EA5A0]"
              :checked="settings.earlyEndBehavior === o.value"
              @change="update({ earlyEndBehavior: o.value })"
            />
            <span>
              <span class="block font-medium">{{ o.label }}</span>
              <span class="block text-sm text-muted">{{ o.hint }}</span>
            </span>
          </label>
        </div>
      </fieldset>
      <label
        v-if="wakeLockSupported()"
        class="mt-3 flex min-h-[3.5rem] cursor-pointer items-center justify-between gap-4 border-y border-line py-2"
      >
        <span>
          <span class="block">Manter a tela ligada</span>
          <span class="block text-sm text-muted">Enquanto houver sessão em andamento e o app estiver aberto.</span>
        </span>
        <input type="checkbox" class="peer sr-only" :checked="settings.keepScreenOn" @change="update({ keepScreenOn: !settings.keepScreenOn })" />
        <span class="toggle" aria-hidden="true"><span :class="settings.keepScreenOn ? 'translate-x-5' : ''" /></span>
      </label>
    </section>

    <!-- Aparência -->
    <section class="mt-8 px-4" aria-labelledby="s-tema">
      <h2 id="s-tema" class="mb-2 text-base">Tema</h2>
      <div class="grid grid-cols-3 gap-1 rounded-control bg-line/60 p-1" role="radiogroup" aria-labelledby="s-tema">
        <button
          v-for="t in THEMES"
          :key="t.value"
          type="button"
          role="radio"
          :aria-checked="settings.theme === t.value"
          class="min-h-touch rounded-[9px] text-sm font-medium transition-colors"
          :class="settings.theme === t.value ? 'bg-surface text-ink shadow-sm' : 'text-muted'"
          @click="update({ theme: t.value })"
        >
          {{ t.label }}
        </button>
      </div>
    </section>

    <!-- Dados -->
    <section class="mt-8 px-4" aria-labelledby="s-dados">
      <h2 id="s-dados" class="mb-1 text-base">Dados e cópia de segurança</h2>
      <p class="text-sm text-muted">
        Tudo fica guardado só neste celular ({{ counts.toys }} brinquedos, {{ counts.sessions }} sessões). Se o app for
        desinstalado, os dados do navegador forem limpos ou o celular for perdido, eles se perdem. Salve cópias com
        frequência e guarde fora do celular.
      </p>

      <p v-if="storage" class="mt-3 text-sm">
        <template v-if="storage.usageBytes !== null && storage.quotaBytes !== null">
          Em uso: {{ formatBytes(storage.usageBytes) }} de {{ formatBytes(storage.quotaBytes) }} disponíveis.
        </template>
        <template v-if="storage.persisted === true"> Armazenamento protegido contra limpeza automática.</template>
        <template v-else-if="storage.persisted === false">
          O navegador pode apagar os dados se faltar espaço.
          <button type="button" class="min-h-[2.75rem] font-semibold text-run-ink underline underline-offset-4" @click="protect">
            Proteger armazenamento
          </button>
        </template>
      </p>

      <div class="mt-4 grid gap-2">
        <button type="button" class="btn-primary w-full" @click="exportBackup">
          <Download :size="19" aria-hidden="true" /> Salvar cópia de segurança
        </button>
        <p class="-mt-1 text-center text-xs text-muted">Última cópia: {{ lastExport }}</p>
        <button type="button" class="btn-quiet w-full" @click="importBackup">
          <Upload :size="19" aria-hidden="true" /> Restaurar uma cópia
        </button>
        <button type="button" class="btn-quiet w-full" @click="exportAllCsv">
          <FileSpreadsheet :size="19" aria-hidden="true" /> Exportar histórico completo (CSV)
        </button>
      </div>

      <label class="mt-4 block">
        <span class="field-label">Lembrar de salvar cópia</span>
        <select class="field" :value="settings.backupReminderDays" @change="update({ backupReminderDays: Number(($event.target as HTMLSelectElement).value) })">
          <option v-for="r in REMINDER" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </label>
    </section>

    <!-- Exemplos -->
    <section class="mt-8 px-4" aria-labelledby="s-demo">
      <h2 id="s-demo" class="mb-1 text-base">Dados de exemplo</h2>
      <p class="text-sm text-muted">
        {{
          demoCount > 0
            ? `Há ${demoCount} brinquedos de exemplo. Remova antes de começar a operar de verdade.`
            : 'Adiciona três brinquedos marcados como exemplo, para conhecer o app. Podem ser removidos depois de uma vez.'
        }}
      </p>
      <button type="button" class="btn-quiet mt-3 w-full" @click="toggleDemo">
        {{ demoCount > 0 ? 'Remover dados de exemplo' : 'Adicionar dados de exemplo' }}
      </button>
    </section>

    <!-- Apagar -->
    <section class="mt-8 px-4" aria-labelledby="s-apagar">
      <h2 id="s-apagar" class="mb-1 text-base">Apagar dados</h2>
      <p class="text-sm text-muted">Remove brinquedos, histórico e configurações deste celular.</p>
      <button type="button" class="btn mt-3 w-full border border-alerta-700/60 text-alerta-700 dark:border-alerta dark:text-[#F28B8B]" @click="wipe">
        <Trash2 :size="18" aria-hidden="true" /> Apagar todos os dados
      </button>
    </section>

    <!-- Sobre -->
    <section class="mt-10 flex flex-col items-center gap-2 px-4 text-center">
      <BrandLogo size="lg" />
      <p class="text-sm text-muted">Controle seu tempo. Aproveite a diversão.</p>
      <p class="tabular text-xs text-muted">Versão {{ APP_VERSION }}</p>
    </section>
  </main>
</template>

