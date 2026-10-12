import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { db } from './composables/services'
import './styles/main.css'

async function boot() {
  try {
    await db.open() // aplica migrações pendentes antes de qualquer tela ler os dados
  } catch (e) {
    const root = document.getElementById('app')
    if (root) {
      root.innerHTML = ''
      const p = document.createElement('p')
      p.style.cssText = 'padding:24px;font-family:system-ui;line-height:1.5'
      p.textContent =
        'O ParquiTime não conseguiu abrir o banco de dados deste celular. Verifique se o navegador não está em modo anônimo e se há espaço livre. Detalhe: ' +
        (e instanceof Error ? e.message : String(e))
      root.appendChild(p)
    }
    return
  }
  createApp(App).use(router).mount('#app')
}

void boot()
