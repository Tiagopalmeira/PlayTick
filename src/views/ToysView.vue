<script setup lang="ts">
import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-vue-next'
import { db, toyRepo } from '@/composables/services'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { toastError } from '@/composables/useToast'
import { CATEGORY_LABEL, type Toy } from '@/domain/models'
import { formatDurationLabel, formatMoney } from '@/utils/format'
import PageTitle from '@/components/layout/PageTitle.vue'
import CategoryIcon from '@/components/toys/CategoryIcon.vue'

const { data: toys, ready } = useLiveQuery(() => db.toys.orderBy('order').toArray(), [] as Toy[])

async function move(id: string, dir: -1 | 1) {
  await toyRepo.move(id, dir).catch(toastError)
}
async function toggle(t: Toy) {
  await toyRepo.setActive(t.id, !t.active).catch(toastError)
}
</script>

<template>
  <main class="mx-auto max-w-2xl pb-28">
    <PageTitle title="Brinquedos">
      <template #action>
        <RouterLink to="/brinquedos/novo" class="btn-primary min-h-[2.75rem] px-3 text-sm">
          <Plus :size="18" :stroke-width="2.5" aria-hidden="true" /> Adicionar
        </RouterLink>
      </template>
    </PageTitle>

    <p v-if="ready && toys.length === 0" class="px-4 pt-4 text-muted">
      Nenhum brinquedo cadastrado ainda.
      <RouterLink to="/brinquedos/novo" class="font-semibold text-run-ink underline underline-offset-4">Cadastrar o primeiro</RouterLink>
    </p>

    <p v-else class="px-4 pb-3 text-sm text-muted">A ordem aqui é a mesma da tela de operação.</p>

    <ul class="border-y border-line bg-surface" aria-label="Brinquedos cadastrados">
      <li
        v-for="(t, i) in toys"
        :key="t.id"
        class="flex items-center gap-2 border-b border-line py-2 pl-4 pr-2 last:border-b-0"
        :class="t.active ? '' : 'opacity-70'"
      >
        <div class="flex flex-col">
          <button
            type="button"
            class="icon-btn min-h-[2.25rem] text-muted disabled:opacity-25"
            :disabled="i === 0"
            :aria-label="`Mover ${t.name} para cima`"
            @click="move(t.id, -1)"
          >
            <ChevronUp :size="22" />
          </button>
          <button
            type="button"
            class="icon-btn min-h-[2.25rem] text-muted disabled:opacity-25"
            :disabled="i === toys.length - 1"
            :aria-label="`Mover ${t.name} para baixo`"
            @click="move(t.id, 1)"
          >
            <ChevronDown :size="22" />
          </button>
        </div>

        <RouterLink :to="`/brinquedos/${t.id}`" class="flex min-w-0 flex-1 items-center gap-3 py-2">
          <CategoryIcon :category="t.category" class="shrink-0 text-muted" />
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ t.name }}</span>
            <span class="tabular block text-sm text-muted">
              {{ CATEGORY_LABEL[t.category] }}, {{ formatDurationLabel(t.durationSec) }}, {{ formatMoney(t.priceCents) }}
            </span>
          </span>
          <Pencil :size="18" class="ml-auto shrink-0 text-muted" aria-hidden="true" />
          <span class="sr-only">Editar</span>
        </RouterLink>

        <label class="flex min-h-touch cursor-pointer items-center gap-2 pl-1 text-sm">
          <span class="sr-only">{{ t.active ? 'Desativar' : 'Ativar' }} {{ t.name }}</span>
          <input type="checkbox" class="peer sr-only" :checked="t.active" @change="toggle(t)" />
          <span class="toggle" aria-hidden="true"><span :class="t.active ? 'translate-x-5' : ''" /></span>
        </label>
      </li>
    </ul>

    <p v-if="toys.some((t) => !t.active)" class="px-4 pt-3 text-sm text-muted">
      Brinquedos desativados não aparecem na operação, mas o histórico deles é mantido.
    </p>
  </main>
</template>
