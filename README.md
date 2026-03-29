# CreditoStock

> **Rastreabilidade fiscal de estoque e composição de créditos de ICMS**

Plataforma B2B para transformar o estoque atual de uma empresa em um dossiê auditável com evidências de nota fiscal (NF-e), alocação de origens (FIFO) e cálculo de créditos de ICMS.

---

## Arquitetura

```
creditostock/
├── apps/
│   ├── api/          # NestJS + Prisma + PostgreSQL (porta 3001)
│   ├── web/          # Next.js 14 + Tailwind + shadcn/ui (porta 3000)
│   └── worker/       # BullMQ workers para jobs assíncronos
├── packages/         # Pacotes compartilhados (futuro)
├── fixtures/         # Arquivos de exemplo CSV e XML
├── docker-compose.yml
└── README.md
```

## Stack

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Frontend     | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend      | NestJS 10, Prisma ORM, class-validator |
| Workers      | BullMQ + Redis                      |
| Banco        | PostgreSQL 16                       |
| Cache/Queue  | Redis 7                             |
| Storage      | MinIO (compatível S3)               |
| Monorepo     | pnpm workspaces                     |

---

## Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- [Docker + Docker Compose](https://docs.docker.com/get-docker/)

---

## Configuração inicial

### 1. Clone e instale dependências

```bash
cd "NOTA FISCAL"

# Copie o arquivo de variáveis de ambiente
cp .env.example .env

# Instale todas as dependências do monorepo
pnpm install
```

### 2. Suba a infraestrutura (PostgreSQL, Redis, MinIO)

```bash
docker compose up -d
```

Aguarde os containers ficarem saudáveis (30–60 segundos). Verifique:

```bash
docker compose ps
```

### 3. Configure o banco de dados

```bash
# Na raiz do monorepo — gera o Prisma Client e cria as tabelas
pnpm db:push

# Popula com dados demo (2 filiais, 50 produtos, 200 itens de estoque, 100 NF-es)
pnpm db:seed
```

### 4. Inicie os serviços

Abra 3 terminais:

**Terminal 1 — API (NestJS)**
```bash
cd apps/api
pnpm dev
```
API disponível em: http://localhost:3001  
Swagger docs: http://localhost:3001/docs

**Terminal 2 — Worker (BullMQ)**
```bash
cd apps/worker
pnpm dev
```

**Terminal 3 — Web (Next.js)**
```bash
cd apps/web
pnpm dev
```
App disponível em: http://localhost:3000

---

## Credenciais de demonstração

| Campo | Valor |
|-------|-------|
| E-mail | `admin@creditostock.com.br` |
| Senha | `password123` |

---

## Fluxo end-to-end

```
1. Login → Dashboard
2. Empresas → Ver filiais cadastradas
3. Importar Estoque → Upload do CSV (fixtures/sample-stock.csv)
4. Importar NF-e XML → Upload do XML (fixtures/sample-nfe-001.xml)
5. Catálogo → Verificar produtos e aliases identificados
6. Conciliação → Executar matching automático + vincular manualmente
7. Pendências → Tratar itens sem correspondência
8. Cálculo de Créditos → Executar cálculo ICMS
9. Dossiês → Gerar e aprovar dossiê fiscal
10. Auditoria → Verificar trilha completa de ações
```

---

## APIs disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Autenticação JWT |
| GET/POST/PUT/DELETE | `/companies` | CRUD de empresas |
| GET/POST/PUT/DELETE | `/branches` | CRUD de filiais |
| POST | `/stock/import` | Importar estoque CSV/XLSX |
| GET | `/stock/:id/items` | Itens do snapshot |
| POST | `/nfe/import-xml` | Importar XMLs NF-e em lote |
| GET | `/products` | Catálogo de produtos |
| POST | `/products/:id/aliases` | Cadastrar alias |
| GET | `/reconciliation` | Lista de itens para conciliação |
| POST | `/reconciliation/:id/manual-link` | Vínculo manual |
| POST | `/reconciliation/run-matching/:id` | Disparar matching |
| POST | `/calculations/run` | Iniciar cálculo de crédito |
| GET | `/calculations/dashboard` | Stats do dashboard |
| GET | `/issues` | Pendências de conciliação |
| POST | `/dossiers` | Criar dossiê |
| PUT | `/dossiers/:id/approve` | Aprovar dossiê |
| GET | `/audit` | Log de auditoria |

---

## Engines de negócio (Worker)

| Queue | Job | Descrição |
|-------|-----|-----------|
| `stock-import` | `process-stock-import` | Persiste itens do CSV, vincula produtos por SKU/EAN |
| `nfe-import` | `process-nfe-items` | Parseia XML NF-e, extrai itens e ICMS |
| `matching` | `run-matching` | Matching por SKU exato → EAN exato → Fuzzy NCM+descrição |
| `calculations` | `run-calculation` | FIFO allocation + cálculo ICMS potencial/aprovado/bloqueado |
| `dossiers` | `generate-dossier` | Geração do dossiê (PDF/ZIP em produção) |

---

## Módulos implementados

1. **Auth** — JWT com Passport, roles ADMIN/ANALYST/VIEWER
2. **Empresas & Filiais** — CNPJ validado, hierarquia empresa → filiais
3. **Produtos & Aliases** — Catálogo com SKU/EAN/NCM + suporte a aliases por fornecedor
4. **Snapshot de Estoque** — Import CSV/XLSX com validação linha por linha
5. **NF-e XML** — Import em lote, parse com fast-xml-parser, armazenamento no MinIO
6. **Engine de Matching** — Exact SKU → Exact EAN → Alias → Fuzzy (NCM + descrição)
7. **Alocação de Origens** — Estratégia FIFO com rastreio por NF-e
8. **Engine de Crédito** — Modos: Estrito / Assistido / Simulação
9. **Pendências (Issues)** — Gravidade CRITICAL/HIGH/MEDIUM/LOW, ciclo de vida completo
10. **Dossiês** — Draft → Em revisão → Aprovado/Rejeitado
11. **Auditoria** — Trilha completa de todas as ações

---

## Entidades do banco

```
Company → Branch → StockSnapshot → StockSnapshotItem
                 → NfeDocument   → NfeItem
StockSnapshotItem ↔ NfeItem via ProductMatch (matching)
StockSnapshotItem ↔ NfeItem via StockOriginAllocation (FIFO)
Branch → CreditCalculation
Branch → Dossier
User → AuditLog
```

---

## Serviços Docker

| Serviço | Porta | Painel |
|---------|-------|--------|
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| MinIO | 9000 (API) | http://localhost:9001 (console) |

MinIO console: http://localhost:9001  
Login: `minioadmin` / `minioadmin`

---

## Dados de demonstração (seed)

- **1 empresa**: Distribuidora Demo Ltda (CNPJ: 12.345.678/0001-90)
- **2 filiais**: São Paulo (SP) e Rio de Janeiro (RJ)
- **2 usuários**: admin + analyst
- **50 produtos** com aliases
- **200 itens de estoque** (snapshot Dez/2024)
- **100 NF-es** com ~400 itens no total
- **150 matches** (120 confirmados, 30 fuzzy)
- **120 alocações** de origem FIFO
- **50 pendências** (mix de OPEN/IN_PROGRESS/RESOLVED)
- **1 cálculo** de crédito concluído (R$ 230k potencial / R$ 185k aprovado)
- **1 dossiê** em revisão

---

## Desenvolvimento

```bash
# Rodar todos os apps em paralelo
pnpm dev

# Prisma Studio (GUI do banco)
pnpm db:studio

# Rebuild do banco (CUIDADO: apaga dados)
pnpm db:push --force-reset && pnpm db:seed
```

---

## Módulo de Transição ICMS-ST

O sistema inclui um módulo completo para apuração de créditos na transição de ICMS-ST para regime normal, conforme reforma tributária.

### Funcionalidades

- **Regras configuráveis** por UF, NCM, CEST, CFOP, CST e data de vigência
- **3 métodos de cálculo**: proporcional ST only, ST + FCP-ST, ou revisão manual
- **Parser XML completo**: extrai todos os campos ICMS-ST, FCP-ST, CEST, orig, modBCST etc.
- **FIFO real**: alocação parcial, múltiplas notas por item, controle de saldo por NfeItem
- **Ledger auditável**: extrato de créditos com geração, uso, bloqueio, ajuste e estorno
- **Dossiê expandido**: CSV e JSON com todos os campos fiscais, crédito calculado e pendências
- **Issues automáticas**: NCM/CFOP/CST incompatível, UF incorreta, dados ST insuficientes

### Limitações jurídicas

O sistema é uma ferramenta de **apoio à apuração**, não substitui parecer tributário. A regra jurídica final deve ser parametrizada e revisada por contador/tributarista. Nenhuma fórmula é hardcoded — tudo é configurável por regra de transição.

### Endpoints da Transição ST

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tax-transition/rules` | Listar regras de transição |
| POST | `/tax-transition/rules` | Criar regra |
| PUT | `/tax-transition/rules/:id` | Atualizar regra |
| DELETE | `/tax-transition/rules/:id` | Remover regra |
| GET | `/transition-credits` | Listar lotes de crédito |
| GET | `/transition-credits/:id` | Detalhe do lote |
| GET | `/transition-credits/balance/:branchId` | Saldo de crédito por filial |
| POST | `/transition-credits/:id/adjust` | Ajuste manual |
| POST | `/transition-credits/:id/block` | Bloquear lote |
| GET | `/transition-ledger` | Extrato do ledger |
| POST | `/calculations/run` | Executar cálculo (kind=ST_TRANSITION) |
| GET | `/dossiers/:id/export-json` | Dossiê completo em JSON |

### Novos modelos de dados

- `TaxTransitionRule` — regras configuráveis por UF/NCM/CEST/CFOP/CST
- `TransitionCreditLot` — lote de crédito por item de estoque x NF-e
- `TransitionCreditLedgerEntry` — extrato contábil de créditos
- `NfeItem` expandido — 17+ campos de ICMS-ST/FCP-ST

### Como testar com fixtures

```bash
# Rodar testes (66 testes em 5 suítes)
cd apps/api && pnpm test

# Rodar seed de transição com fixture real
cd apps/api && pnpm demo:transition
```

Os fixtures estão em `fixtures/`:
- `sample-nfe-real.xml` — NF-e real com ICMS-ST (Boticário/Calamo, MS→MT)
- `estoque-retaguarda.pdf` — PDF de estoque no formato RetaguardaGB

---

## Próximos passos

- [ ] Frontend completo para transição ST (telas de regras, cálculos, ledger)
- [ ] Geração de PDF/ZIP de dossiês com PDFKit
- [ ] Multi-tenant com Row Level Security
- [ ] Webhooks para integração com ERP
- [ ] Export para planilha SPED
- [ ] Notificações por e-mail
