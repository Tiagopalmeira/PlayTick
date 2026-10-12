<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Trash2 } from 'lucide-vue-next'
import { sessionRepo, toyRepo } from '@/composables/services'
import { confirmAction } from '@/composables/useConfirm'
import { toast, toastError } from '@/composables/useToast'
import { CATEGORY_LABEL, TOY_CATEGORIES, TOY_LIMITS, validateToyInput, type ToyInput } from '@/domain/models'
import { ValidationError } from '@/db/repositories/toyRepository'
import { centsToInput, parseMoney } from '@/utils/format'
import PageTitle from '@/components/layout/PageTitle.vue'
import DurationInput from '@/components/toys/DurationInput.vue'
import CategoryIcon from '@/components/toys/CategoryIcon.vue'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const isNew = computed(() => !props.id)

const form = reactive<ToyInput>({ name: '', category: 'motinha', durationSec: 5 * 60, priceCents: 0, active: true })
const priceText = ref('')
const errors = ref<string[]>([])
const loaded = ref(isNew.value)
const notFound = ref(false)
const saving = ref(false)
const hasOpenSession = ref(false)

onMounted(async () => {
  if (!props.id) return
  const toy = await toyRepo.get(props.id)
  if (!toy) {
    notFound.value = true
    return
  }
  Object.assign(form, { name: toy.name, category: toy.category, durationSec: toy.durationSec, priceCents: toy.priceCents, active: toy.active })
  priceText.value = centsToInput(toy.priceCents)
  hasOpenSession.value = !!(await sessionRepo.findOpenForToy(toy.id))
  loaded.value = true
})

const priceCents = computed(() => parseMoney(priceText.value))

async function save() {
  const input: ToyInput = { ...form, priceCents: priceCents.value ?? -1 }
  errors.value = priceCents.value === null ? ['Informe o preço, por exemplo 10,00.'] : validateToyInput(input)
  if (errors.value.length) return showErrors()
  saving.value = true
  try {
    if (props.id) await toyRepo.update(props.id, input)
    else await toyRepo.create(input)
    toast(isNew.value ? `${input.name.trim()} cadastrado` : 'Alterações salvas', 'success')
    if (window.history.state?.back) router.back()
    else await router.replace('/brinquedos')
  } catch (e) {
    if (e instanceof ValidationError) {
      errors.value = e.errors
      await showErrors()
    }
    else toastError(e)
  } finally {
    saving.value = false
  }
}

const errorBox = ref<HTMLElement | null>(null)
async function showErrors() {
  await nextTick()
  errorBox.value?.scrollIntoView({ block: 'center' })
  errorBox.value?.focus()
}

async function remove() {
  if (!props.id) return
  const blocker = await toyRepo.deleteBlocker(props.id)
  if (blocker) {
    await confirmAction({ title: 'Não é possível excluir', message: blocker, confirmLabel: 'Entendi', cancelLabel: 'Fechar' })
    return
  }
  const ok = await confirmAction({
    title: `Excluir ${form.name}?`,
    message: 'O brinquedo será removido do aparelho. Ele ainda não tem sessões registradas.',
    confirmLabel: 'Excluir brinquedo',
    danger: true,
  })
  if (!ok) return
  try {
    await toyRepo.remove(props.id)
    toast('Brinquedo excluído', 'info')
    await router.replace('/brinquedos')
  } catch (e) {
    toastError(e)
  }
}
</script>

<template>
  <main class="mx-auto max-w-2xl pb-28">
    <PageTitle :title="isNew ? 'Novo brinquedo' : 'Editar brinquedo'" back="/brinquedos" />

    <p v-if="notFound" class="px-4 text-muted">Este brinquedo não existe mais.</p>

    <form v-else-if="loaded" class="flex flex-col gap-6 px-4 pt-2" novalidate @submit.prevent="save">
      <div v-if="errors.length" ref="errorBox" tabindex="-1" class="rounded-control bg-done-bg px-4 py-3 text-sm" role="alert">
        <p v-for="e in errors" :key="e">{{ e }}</p>
      </div>

      <label>
        <span class="field-label">Nome</span>
        <input
          v-model="form.name"
          class="field"
          :maxlength="TOY_LIMITS.nameMax"
          placeholder="Ex.: Motinha vermelha"
          autocomplete="off"
          enterkeyhint="next"
          required
        />
      </label>

      <fieldset>
        <legend class="field-label">Categoria</legend>
        <div class="grid grid-cols-3 gap-2">
          <label
            v-for="c in TOY_CATEGORIES"
            :key="c"
            class="flex min-h-[4rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-control border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-alegria"
            :class="form.category === c ? 'border-parque bg-run-bg text-ink' : 'border-line bg-surface text-muted'"
          >
            <input v-model="form.category" type="radio" name="category" :value="c" class="sr-only" />
            <CategoryIcon :category="c" />
            {{ CATEGORY_LABEL[c] }}
          </label>
        </div>
      </fieldset>

      <DurationInput v-model="form.durationSec" />

      <label>
        <span class="field-label">Preço da volta</span>
        <span class="relative block w-44">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">R$</span>
          <input
            v-model="priceText"
            class="field tabular pl-10"
            inputmode="decimal"
            placeholder="0,00"
            autocomplete="off"
            @blur="priceCents !== null && (priceText = centsToInput(priceCents))"
          />
        </span>
        <span v-if="!isNew" class="mt-1.5 block text-sm text-muted">
          Mudar o preço vale só para as próximas sessões. As já registradas mantêm o valor cobrado.
        </span>
      </label>

      <label class="flex min-h-touch cursor-pointer items-center justify-between gap-4">
        <span>
          <span class="block font-medium">Disponível na operação</span>
          <span class="block text-sm text-muted">Desative para esconder sem perder o histórico.</span>
        </span>
        <input v-model="form.active" type="checkbox" class="peer sr-only" />
        <span class="toggle" aria-hidden="true"><span :class="form.active ? 'translate-x-5' : ''" /></span>
      </label>
      <p v-if="hasOpenSession && !form.active" class="-mt-4 text-sm text-muted">
        A sessão aberta continua na operação até ser finalizada.
      </p>

      <button type="submit" class="btn-primary w-full text-base" :disabled="saving">
        {{ isNew ? 'Cadastrar brinquedo' : 'Salvar alterações' }}
      </button>

      <button v-if="!isNew" type="button" class="btn-ghost w-full text-alerta-700 dark:text-[#F28B8B]" @click="remove">
        <Trash2 :size="18" aria-hidden="true" /> Excluir brinquedo
      </button>
    </form>
  </main>
</template>
