# ParquiTime

**Controle seu tempo. Aproveite a diversão.**

PWA offline-first para controlar o tempo e o faturamento de brinquedos (motinhas, pula-pulas e outros) num parquinho, usando um único celular. Sem backend, sem login, sem internet depois da primeira carga: tudo fica no IndexedDB do aparelho.

## Como rodar

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm test           # testes unitários (Vitest)
npm run typecheck  # TypeScript strict
npm run build      # typecheck + build de produção em dist/ (com Service Worker)
npm run preview    # serve o build em http://localhost:4173
npm run icons      # regenera ícones/favicons a partir do símbolo vetorial
```

### Instalar no Android

1. Publique a pasta `dist/` em qualquer hospedagem estática **com HTTPS** (Netlify, Vercel, GitHub Pages, Cloudflare Pages, um servidor nginx próprio etc.). Service Worker só funciona em HTTPS ou em `localhost`.
   - O app usa rotas de histórico (`/historico`, `/ajustes`…). Configure a hospedagem para responder `index.html` em qualquer rota (fallback de SPA). Depois da primeira visita, o Service Worker já cuida disso offline.
2. Abra o endereço no Chrome do Android, espere carregar e toque em **Instalar app** (ou menu ⋮ → *Adicionar à tela inicial*).
3. Abra pelo ícone. A partir daí funciona sem internet.

Para testar no celular pela rede local durante o desenvolvimento: `npm run dev -- --host`. A instalação como PWA exige HTTPS, então use um túnel (ex.: `cloudflared`, `ngrok`) apontando para o `npm run preview`.

## O que o app faz

- **Operação** (tela inicial): todos os brinquedos ativos numa coluna, cada um com o próprio cronômetro. Iniciar, pausar, continuar e finalizar com um toque. Estados com texto, ícone e cor: *Em andamento* (verde), *Pausada* (amarelo), *Tempo esgotado* (vermelho, com alerta sonoro, vibração e botões **Nova volta** e **Dispensar**). O cabeçalho mostra o faturamento do dia.
- **Sessão**: cronômetro grande com anel de progresso, duração original, valor, horários e controles.
- **Brinquedos**: cadastro com nome, categoria, duração (atalhos de 3 a 30 min ou minutos e segundos livres) e preço; ativar/desativar; reordenar; excluir só quando não há histórico (senão, desativar).
- **Histórico**: filtros por data, brinquedo, categoria e status; faturamento líquido, bruto, cancelamentos e em aberto; receita por brinquedo; lista de sessões; exportação CSV.
- **Configurações**: som (com volume e teste), vibração, tema claro/escuro/do celular, comportamento ao finalizar antes do tempo, manter a tela ligada, cópia de segurança JSON (exportar e restaurar com validação), CSV completo, lembrete de backup, dados de exemplo e apagar tudo (exige digitar APAGAR).

## Regra de faturamento

Implementada em `src/domain/services/revenue.ts`:

| Situação da sessão | Conta como receita? | Onde aparece |
|---|---|---|
| Concluída por tempo esgotado | Sim, valor integral | Líquido e bruto |
| Finalizada antes do tempo ("Finalizar e cobrar") | Sim, valor integral | Líquido e bruto |
| Cancelada sem cobrança | Não | Bruto e cancelamentos |
| Em andamento ou pausada | Ainda não | "Em aberto" |

- **Bruto** = concluídas + canceladas. **Líquido** = bruto − cancelamentos = soma das concluídas.
- O preço é **copiado para a sessão no início**. Mudar o preço do brinquedo depois não altera sessões já registradas.
- Cada sessão tem um único status e uma única **data operacional** (dia local do início), então nunca é contada duas vezes nem misturada entre dias. O histórico sempre mostra um dia por vez.
- Valores são sempre **centavos inteiros**.

## Como os cronômetros funcionam

- Uma sessão em andamento guarda `expectedEndAt` (instante previsto de término). O tempo restante é sempre `expectedEndAt − agora`, e nunca um contador decrementado.
- Ao pausar, o tempo restante é congelado em `remainingMsAtPause`. Ao continuar, um novo `expectedEndAt` é calculado.
- O `TimerService` (`src/domain/services/timerService.ts`) é independente de Vue e recebe o relógio por injeção (os testes usam um relógio simulado).
- O `setInterval` de 250 ms (`src/composables/useTimerEngine.ts`) **só redesenha a tela** e pede para conferir expirações. Ao voltar do segundo plano, desbloquear a tela ou reabrir o app, tudo é **reconciliado** a partir do IndexedDB.
- A expiração é **idempotente**: uma transação confere se a sessão ainda está em andamento antes de encerrá-la, e um conjunto em memória impede encerramentos concorrentes. O alerta dispara uma única vez por sessão.
- Uma sessão que expirou com o app fechado é registrada com o término no **horário previsto**, não no horário em que o app percebeu.

## Arquitetura

```
src/
  assets/brand/        símbolo vetorial (fundo claro e escuro)
  components/
    brand/             logotipo e símbolo
    feedback/          folha inferior, confirmação, avisos, atualização, lembrete de backup
    layout/            cabeçalho, navegação inferior, título de página
    timers/            dígitos do cronômetro, pista do brinquedo, folha de finalização
    toys/              ícone de categoria, campo de duração
  composables/         ligação entre serviços e Vue (liveQuery, motor de atualização, ações)
  db/
    database.ts        Dexie (IndexedDB)
    migrations/        versões do schema (nunca editar uma versão publicada)
    repositories/      brinquedos, sessões, configurações
    backup.ts          exportação/validação/restauração JSON
    demo.ts            dados de exemplo isolados (isDemo)
  domain/
    models/            tipos e validação
    services/          regras de sessão, TimerService, faturamento, CSV
  platform/            APIs do navegador: áudio, vibração, wake lock, arquivos, armazenamento
  router/  styles/  utils/  views/
tests/                 Vitest + fake-indexeddb
scripts/               geração de ícones
```

## Testes

`npm test` cobre: início de sessão, pausa e retomada, expiração, múltiplos cronômetros simultâneos, persistência após recarregar, reconciliação de sessões expiradas, finalização idempotente (inclusive concorrente e entre duas instâncias), alteração de preço sem afetar sessões antigas, cálculo do faturamento (com separação de dias), exportação/importação com validação, CSV, migração v1 → v2 e formatação.

## Identidade visual

- Paleta: Carvão `#0F172A`, Verde Parque `#0EA5A0`, Amarelo Alegria `#F59E0B`, Cinza Suave `#E5E7EB`, Cinza Escuro `#1F2937`, Branco `#FFFFFF`, Vermelho `#DC4545`. Tokens em `tailwind.config.ts` e `src/styles/main.css`.
- Contraste: branco sobre o Verde Parque não atinge 4,5:1, por isso os botões primários usam **texto Carvão sobre verde** (6,6:1). Textos verdes sobre fundo claro usam um verde escurecido (`#0B7F7B`). O estado de tempo esgotado usa o vermelho escurecido `#B42F2F` para o texto branco ficar legível.
- Poppins 400/500/600 empacotada pelo `@fontsource/poppins` (sem requisição a serviços de fontes).
- Símbolo: o aro do cronômetro é também uma roda em movimento. Ele se abre embaixo à esquerda e dali saem traços de velocidade. Fonte vetorial em `scripts/generate-icons.mjs` e `src/components/brand/BrandSymbol.vue`.

## Limitações conhecidas

- **Alertas com a tela bloqueada**: navegadores móveis suspendem a execução em segundo plano. O tempo continua correto, mas o som e a vibração só acontecem quando o app volta para a tela. A opção *Manter a tela ligada* (Wake Lock) reduz o problema enquanto o app está aberto. Notificações push agendadas exigiriam um servidor, o que está fora do escopo.
- **Som antes do primeiro toque**: depois de reabrir o app, o navegador só libera áudio após um toque na tela. Um aviso aparece quando há sessões em andamento e o som ainda está bloqueado.
- **Dados só no aparelho**: limpar os dados do navegador, desinstalar o app ou perder o celular apaga tudo. Use a cópia de segurança (há lembrete configurável) e o botão *Proteger armazenamento* (`navigator.storage.persist`).
- **Um celular por vez**: não há sincronização entre aparelhos. Duas abas abertas no mesmo celular não corrompem dados (a expiração é transacional), mas o uso previsto é uma única tela.
- **Relógio do sistema**: o cálculo usa o relógio do celular. Se alguém mudar a hora do aparelho durante uma sessão, o tempo restante muda junto.
- A data operacional é o dia local do início da sessão. Sessões que atravessam a meia-noite contam no dia em que começaram.
