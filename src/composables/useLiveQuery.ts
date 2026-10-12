import { liveQuery, type Subscription } from 'dexie'
import { onScopeDispose, ref, shallowRef, watch, type Ref, type WatchSource } from 'vue'

/**
 * Liga uma consulta do Dexie a um ref do Vue: qualquer gravação no IndexedDB
 * que afete o resultado atualiza a tela automaticamente.
 */
export function useLiveQuery<T>(query: () => Promise<T>, initial: T, deps: WatchSource[] = []) {
  const data = shallowRef(initial) as Ref<T>
  const ready = ref(false)
  const error = ref<string | null>(null)
  let sub: Subscription | null = null

  const subscribe = () => {
    sub?.unsubscribe()
    sub = liveQuery(query).subscribe({
      next: (v) => {
        data.value = v
        ready.value = true
        error.value = null
      },
      error: (e: unknown) => {
        error.value = e instanceof Error ? e.message : 'Não foi possível ler os dados do aparelho.'
        ready.value = true
      },
    })
  }

  if (deps.length) watch(deps, subscribe, { immediate: true })
  else subscribe()
  onScopeDispose(() => sub?.unsubscribe())

  return { data, ready, error }
}
