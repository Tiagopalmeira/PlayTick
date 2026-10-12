import { createRouter, createWebHistory } from 'vue-router'
import OperationView from '@/views/OperationView.vue'
import SessionView from '@/views/SessionView.vue'
import ToysView from '@/views/ToysView.vue'
import ToyEditView from '@/views/ToyEditView.vue'
import HistoryView from '@/views/HistoryView.vue'
import SettingsView from '@/views/SettingsView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'operacao', component: OperationView, meta: { title: 'Operação' } },
    { path: '/sessao/:id', name: 'sessao', component: SessionView, props: true, meta: { title: 'Sessão' } },
    { path: '/brinquedos', name: 'brinquedos', component: ToysView, meta: { title: 'Brinquedos' } },
    { path: '/brinquedos/novo', name: 'brinquedo-novo', component: ToyEditView, meta: { title: 'Novo brinquedo' } },
    { path: '/brinquedos/:id', name: 'brinquedo', component: ToyEditView, props: true, meta: { title: 'Editar brinquedo' } },
    { path: '/historico', name: 'historico', component: HistoryView, meta: { title: 'Histórico' } },
    { path: '/ajustes', name: 'ajustes', component: SettingsView, meta: { title: 'Configurações' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  // Volta para a mesma posição da lista ao retornar à operação.
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 }
  },
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title && to.name !== 'operacao' ? `${title} | ParquiTime` : 'ParquiTime'
})
