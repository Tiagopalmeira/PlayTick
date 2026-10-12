<script setup lang="ts">
import { computed, ref } from 'vue'
import { Ban, CircleCheck, FileSpreadsheet, Pause, Play, TimerOff } from 'lucide-vue-next'
import { db, sessionRepo } from '@/composables/services'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { useNow } from '@/composables/useTimerEngine'
import { exportCsv } from '@/composables/useDataTransfer'
import { CATEGORY_LABEL, STATUS_LABEL, TOY_CATEGORIES, type Session, type SessionStatus, type Toy, type ToyCategory } from '@/domain/models'
import { summarize } from '@/domain/services/revenue'
import { formatMoney, formatOperationalDate, formatTime, toOperationalDate } from '@/utils/format'
import PageTitle from '@/components/layout/PageTitle.vue'

const now = useNow()
const today = toOperationalDate(now.value)

const date = ref(today)
const toyId = ref('')
const category = ref<ToyCategory | ''>('')
const status = ref<SessionStatus | ''>('')

const { data: dates } = useLiveQuery(() => sessionRepo.listDates(), [] as string[])
const { data: toys } = useLiveQuery(() => db.toys.orderBy('order').toArray(), [] as Toy[])
// Todas as sessões do dia (para o resumo) — os filtros de brinquedo/categoria/status refinam a lista.
const { data: daySessions } = useLiveQuery(() => sessionRepo.list({ date: date.value }), [] as Session[], [date])

const dateOptions = computed(() => [...new Set([today, ...dates.value])].sort().reverse())
const filtered = computed(() =>
  daySessions.value.filter(
    (s) =>
      (!toyId.value || s.toyId === toyId.value) &&
      (!category.value || s.toyCategory === category.value) &&
      (!status.value || s.status === status.value),
  ),
)
const summary = computed(() => summarize(filtered.value))
const hasFilters = computed(() => !!(toyId.value || category.value || status.value))

const dateLabel = (d: string) => (d === today ? `Hoje, ${formatOperationalDate(d)}` : formatOperationalDate(d))

function clearFilters() {
  toyId.value = ''
  category.value = ''
  status.value = ''
}

function rowStatus(s: Session) {
  if (s.status === 'completed' && s.endReason === 'expired') return { text: 'Tempo esgotado', icon: TimerOff, cls: '' }
  if (s.status === 'completed') return { text: 'Antes do tempo', icon: CircleCheck, cls: '' }
  if (s.status === 'cancelled') return { text: 'Cancelada', icon: Ban, cls: 'text-alerta-700 dark:text-[#F28B8B]' }
  if (s.status === 'paused') return { text: 'Pausada', icon: Pause, cls: '' }
  return { text: 'Em andamento', icon: Play, cls: 'text-run-ink' }
}
</script>

<template>
  <main class="mx-auto max-w-2xl pb-28">
    <PageTitle title="Histórico" />

    <!-- Filtros -->
    <section class="px-4" aria-label="Filtros">
      <label class="block">
        <span class="sr-only">Data</span>
        <select v-model="date" class="field font-medium">
          <option v-for="d in dateOptions" :key="d" :value="d">{{ dateLabel(d) }}</option>
        </select>
      </label>
      <div class="mt-2 grid grid-cols-3 gap-2">
        <label>
          <span class="sr-only">Brinquedo</span>
          <select v-model="toyId" class="field px-2 text-sm">
            <option value="">Brinquedos</option>
            <option v-for="t in toys" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Categoria</span>
          <select v-model="category" class="field px-2 text-sm">
            <option value="">Categorias</option>
            <option v-for="c in TOY_CATEGORIES" :key="c" :value="c">{{ CATEGORY_LABEL[c] }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Status</span>
          <select v-model="status" class="field px-2 text-sm">
            <option value="">Status</option>
            <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </div>
      <button v-if="hasFilters" type="button" class="mt-1 min-h-[2.75rem] text-sm font-semibold text-run-ink" @click="clearFilters">
        Limpar filtros
      </button>
    </section>

    <!-- Faturamento -->
    <section class="mt-6 px-4" aria-labelledby="fat-title">
      <h2 id="fat-title" class="text-sm font-medium text-muted">
        Faturamento {{ date === today ? 'de hoje' : `de ${formatOperationalDate(date)}` }}{{ hasFilters ? ' (filtrado)' : '' }}
      </h2>
      <p class="tabular mt-1 text-[2.25rem] font-semibold leading-tight">{{ formatMoney(summary.netCents) }}</p>
      <p class="text-sm text-muted">
        {{ summary.completedCount }} {{ summary.completedCount === 1 ? 'sessão concluída' : 'sessões concluídas' }}<template
          v-if="summary.earlyCount"
          >, {{ summary.earlyCount }} antes do tempo</template
        >
      </p>

      <dl class="mt-4 divide-y divide-line border-y border-line">
        <div class="flex justify-between py-2.5">
          <dt>Bruto</dt>
          <dd class="tabular font-medium">{{ formatMoney(summary.grossCents) }}</dd>
        </div>
        <div class="flex justify-between py-2.5">
          <dt>Cancelamentos ({{ summary.cancelledCount }})</dt>
          <dd class="tabular font-medium" :class="summary.cancelledCents ? 'text-alerta-700 dark:text-[#F28B8B]' : ''">
            {{ summary.cancelledCents ? `− ${formatMoney(summary.cancelledCents)}` : formatMoney(0) }}
          </dd>
        </div>
        <div class="flex justify-between py-2.5 font-semibold">
          <dt>Líquido</dt>
          <dd class="tabular">{{ formatMoney(summary.netCents) }}</dd>
        </div>
        <div v-if="summary.openCount" class="flex justify-between py-2.5 text-muted">
          <dt>Em aberto, ainda não contam ({{ summary.openCount }})</dt>
          <dd class="tabular">{{ formatMoney(summary.openCents) }}</dd>
        </div>
      </dl>

      <details class="mt-2 text-sm text-muted">
        <summary class="min-h-[2.75rem] cursor-pointer py-2.5 font-medium">Como o faturamento é calculado</summary>
        <p class="pb-2">
          Cada sessão é cobrada pelo valor registrado no início. Contam como receita as sessões concluídas, tanto por tempo
          esgotado quanto finalizadas antes do tempo. Sessões canceladas entram no bruto e saem como cancelamento. Sessões em
          andamento ou pausadas só contam quando terminam. Cada dia é calculado separadamente.
        </p>
      </details>
    </section>

    <!-- Por brinquedo -->
    <section v-if="summary.byToy.length" class="mt-6 px-4" aria-labelledby="toy-title">
      <h2 id="toy-title" class="mb-2 text-base">Por brinquedo</h2>
      <table class="w-full text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th scope="col" class="py-1.5 font-medium">Brinquedo</th>
            <th scope="col" class="py-1.5 text-right font-medium">Sessões</th>
            <th scope="col" class="py-1.5 text-right font-medium">Receita</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line border-y border-line">
          <tr v-for="r in summary.byToy" :key="r.toyId">
            <td class="py-2.5 pr-2">{{ r.toyName }}</td>
            <td class="tabular py-2.5 text-right">
              {{ r.completed }}<span v-if="r.cancelled" class="text-muted"> +{{ r.cancelled }} canc.</span>
            </td>
            <td class="tabular py-2.5 text-right font-medium">{{ formatMoney(r.revenueCents) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Sessões -->
    <section class="mt-6" aria-labelledby="sess-title">
      <div class="flex items-center justify-between px-4">
        <h2 id="sess-title" class="text-base">Sessões</h2>
        <button type="button" class="btn-ghost min-h-[2.75rem] px-2 text-sm" @click="exportCsv(filtered, date)">
          <FileSpreadsheet :size="18" aria-hidden="true" /> Exportar CSV
        </button>
      </div>

      <p v-if="filtered.length === 0" class="px-4 py-6 text-muted">
        {{ hasFilters ? 'Nenhuma sessão com esses filtros.' : 'Nenhuma sessão registrada neste dia.' }}
      </p>

      <ul v-else class="mt-1 border-y border-line bg-surface">
        <li v-for="s in filtered" :key="s.id" class="border-b border-line last:border-b-0">
          <RouterLink :to="`/sessao/${s.id}`" class="flex items-center gap-3 px-4 py-3">
            <span class="tabular w-[5.5rem] shrink-0 text-sm font-medium">
              {{ formatTime(s.startedAt) }}–{{ s.endedAt ? formatTime(s.endedAt) : '…' }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ s.toyName }}</span>
              <span class="flex items-center gap-1 text-xs font-medium text-muted" :class="rowStatus(s).cls">
                <component :is="rowStatus(s).icon" :size="14" aria-hidden="true" />
                {{ rowStatus(s).text }}<template v-if="s.endNote">: {{ s.endNote }}</template>
              </span>
            </span>
            <span class="tabular shrink-0 font-medium" :class="s.status === 'cancelled' ? 'text-muted line-through' : ''">
              {{ formatMoney(s.priceCents) }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>
