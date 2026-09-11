# XCNTRX HUB — Kanban

Kanban pessoal em Next.js 16 com Postgres (Neon), servidor MCP para agentes
(Gemini Spark e Claude) e autenticação Google.

## Arquitetura

```
Gemini Spark (nuvem)  ─┐
Claude / Antigravity  ─┼─→  /api/mcp   (OAuth Google)   ─┐
Navegador             ─┴─→  /api/*     (cookie de sessão)─┴─→  Neon Postgres
```

Agentes e interface entram por caminhos diferentes, mas caem na mesma camada de
consultas (`lib/db/queries.ts`). Nenhum dos dois fala com o banco direto.

## Decisões que não são óbvias no código

**`ON DELETE CASCADE` nas chaves estrangeiras.** Apagar uma lista leva seus cards
por constraint do banco, não por código de aplicação. A versão anterior, que
usava Google Sheets, deixava cards órfãos — a importação encontrou dois.

**`position` é `double precision`, não inteiro sequencial.** Arrastar um card
grava o ponto médio entre os vizinhos, então escreve uma linha em vez de
renumerar a lista inteira.

**`updated_at` vem de um trigger no banco.** Carimbar pela aplicação usa o
relógio da máquina, que pode estar atrás do relógio do Postgres; uma alteração
ficaria com timestamp anterior ao próprio insert e sumiria da detecção de
mudanças.

**O token de versão inclui contagem de linhas.** Uma exclusão não deixa nenhuma
linha cujo `updated_at` pudesse mudar, então `max(updated_at)` sozinho não
perceberia o card removido.

**O arquivo de middleware é `proxy.ts`.** O Next 16 renomeou a convenção. Ele
assina a sessão com Web Crypto, não `node:crypto`, porque roda no runtime de
edge.

**O Google é o provedor de identidade do MCP.** O Spark só aceita MCP via OAuth,
e o Drive já exigia OAuth do Google — o mesmo client atende aos dois.

## Como rodar

```bash
npm install
cp .env.example .env   # preencha os valores
npm run db:migrate
npm run dev
```

### Variáveis

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Neon, string *pooled* |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login, Drive e identidade do MCP |
| `GOOGLE_REDIRECT_URI` | Callback do OAuth, por ambiente |
| `OWNER_EMAIL` | Única conta com acesso ao app e ao MCP |
| `SESSION_SECRET` | Assina o cookie de sessão |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | Aplica migrações no Neon |
| `npm run db:studio` | Abre o Drizzle Studio |
| `npx tsx scripts/verify-db.ts` | Confirma cascade e token de versão no banco real |
| `npx tsx scripts/test-mcp.ts` | Exercita o MCP como Spark e Claude fazem |

## Conectar um agente

A URL do MCP é `<origem>/api/mcp`. No Gemini Spark, cadastre em
`gemini.google.com/apps` como app personalizado, usando o Google como OAuth
(authorization URL `https://accounts.google.com/o/oauth2/v2/auth`, token URL
`https://oauth2.googleapis.com/token`, escopos `openid email`).
