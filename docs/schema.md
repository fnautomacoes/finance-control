# Finance Control - Schema do Banco de Dados

## Visão Geral

O Finance Control utiliza **PostgreSQL 16+** como banco de dados principal, gerenciado pelo **Prisma ORM**.

### Características do Schema

- **Precisão Monetária**: Todos os valores monetários usam `DECIMAL(19,4)` para 4 casas decimais
- **Quantidades de Ativos**: Usam `DECIMAL(19,8)` para suportar criptomoedas e fracionários
- **Multi-tenancy**: Todas as tabelas principais têm `organization_id` para isolamento de dados
- **Auditoria**: Logs imutáveis de todas as operações financeiras
- **Soft Delete**: Campos `is_active` e `is_archived` ao invés de exclusão física

---

## Diagrama de Relacionamentos

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    users    │──────▶│ organization_    │◀──────│organizations│
└─────────────┘       │    members       │       └─────────────┘
       │              └──────────────────┘              │
       │                                                │
       ▼                                                ▼
┌─────────────┐                               ┌─────────────────┐
│  sessions   │                               │    accounts     │
└─────────────┘                               └─────────────────┘
       │                                                │
       │                                                ▼
       │                                      ┌─────────────────┐
       │                                      │  transactions   │
       │                                      └─────────────────┘
       │                                        │   │   │   │
       ▼                                        ▼   ▼   ▼   ▼
┌─────────────┐                    ┌──────────┐ ┌──────────┐ ┌──────────┐
│ audit_logs  │                    │categories│ │cost_     │ │projects  │
└─────────────┘                    └──────────┘ │centers   │ └──────────┘
                                                └──────────┘
```

---

## Tabelas

### 1. users (Usuários)

Armazena informações dos usuários do sistema.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único (CUID) |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email do usuário |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash da senha (bcrypt) |
| `name` | VARCHAR(100) | NOT NULL | Nome completo |
| `avatar_url` | VARCHAR(500) | NULL | URL do avatar |
| `email_verified` | BOOLEAN | NOT NULL, DEFAULT false | Email verificado? |
| `mfa_enabled` | BOOLEAN | NOT NULL, DEFAULT false | MFA ativo? |
| `mfa_secret` | VARCHAR(255) | NULL | Segredo TOTP criptografado |
| `default_currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda padrão |
| `locale` | VARCHAR(10) | NOT NULL, DEFAULT 'pt-BR' | Idioma |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'America/Sao_Paulo' | Fuso horário |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Data de criação |
| `updated_at` | TIMESTAMP | NOT NULL | Última atualização |
| `last_login_at` | TIMESTAMP | NULL | Último login |

**Índices:**
- `users_email_key` (UNIQUE) em `email`

---

### 2. sessions (Sessões)

Controla sessões ativas dos usuários.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `user_id` | VARCHAR(25) | FK → users | Usuário |
| `token` | VARCHAR(500) | NOT NULL, UNIQUE | Token JWT |
| `user_agent` | VARCHAR(500) | NULL | Navegador/dispositivo |
| `ip_address` | VARCHAR(45) | NULL | Endereço IP |
| `expires_at` | TIMESTAMP | NOT NULL | Expiração |
| `created_at` | TIMESTAMP | NOT NULL | Criação |

**Índices:**
- `sessions_user_id_idx` em `user_id`
- `sessions_token_key` (UNIQUE) em `token`

---

### 3. organizations (Organizações)

Representa uma conta (pessoal ou empresarial).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `name` | VARCHAR(100) | NOT NULL | Nome da organização |
| `type` | ENUM | NOT NULL, DEFAULT 'PERSONAL' | PERSONAL ou BUSINESS |
| `default_currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda padrão |
| `fiscal_year_start` | INTEGER | NOT NULL, DEFAULT 1 | Mês início ano fiscal (1-12) |
| `tax_id` | VARCHAR(20) | NULL | CNPJ ou CPF |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `OrganizationType`: PERSONAL, BUSINESS

---

### 4. organization_members (Membros)

Relacionamento entre usuários e organizações.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `user_id` | VARCHAR(25) | FK → users | Usuário |
| `role` | ENUM | NOT NULL, DEFAULT 'MEMBER' | Papel |
| `permissions` | JSONB | NOT NULL, DEFAULT '{}' | Permissões granulares |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `UserRole`: OWNER, ADMIN, MEMBER, VIEWER

**Índices:**
- `organization_members_organization_id_user_id_key` (UNIQUE)
- `organization_members_user_id_idx`

---

### 5. accounts (Contas Financeiras)

Contas bancárias, cartões, carteiras.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `name` | VARCHAR(100) | NOT NULL | Nome da conta |
| `type` | ENUM | NOT NULL | Tipo da conta |
| `currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda |
| `initial_balance` | DECIMAL(19,4) | NOT NULL, DEFAULT 0 | Saldo inicial |
| `initial_date` | DATE | NOT NULL | Data do saldo inicial |
| `credit_limit` | DECIMAL(19,4) | NULL | Limite (cartão crédito) |
| `closing_day` | INTEGER | NULL | Dia fechamento fatura |
| `due_day` | INTEGER | NULL | Dia vencimento fatura |
| `bank_code` | VARCHAR(10) | NULL | Código do banco |
| `agency_number` | VARCHAR(20) | NULL | Número da agência |
| `account_number` | VARCHAR(30) | NULL | Número da conta |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT '#6366f1' | Cor (hex) |
| `icon` | VARCHAR(50) | NOT NULL, DEFAULT 'wallet' | Ícone |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT false | Arquivado? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `AccountType`: CHECKING, SAVINGS, INVESTMENT, CREDIT_CARD, CASH, DIGITAL_WALLET, OTHER

**Índices:**
- `accounts_organization_id_idx`
- `accounts_organization_id_type_idx`

---

### 6. categories (Categorias)

Categorias de receitas e despesas (hierárquicas).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `parent_id` | VARCHAR(25) | FK → categories | Categoria pai (subcategoria) |
| `name` | VARCHAR(100) | NOT NULL | Nome |
| `type` | ENUM | NOT NULL | INCOME ou EXPENSE |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT '#6366f1' | Cor |
| `icon` | VARCHAR(50) | NOT NULL, DEFAULT 'tag' | Ícone |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Ordem |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | Categoria do sistema? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `TransactionType`: INCOME, EXPENSE, TRANSFER

**Índices:**
- `categories_organization_id_idx`
- `categories_organization_id_type_idx`
- `categories_organization_id_parent_id_name_key` (UNIQUE)

---

### 7. transactions (Transações)

Receitas, despesas e transferências.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `type` | ENUM | NOT NULL | INCOME, EXPENSE, TRANSFER |
| `status` | ENUM | NOT NULL, DEFAULT 'COMPLETED' | Status |
| `amount` | DECIMAL(19,4) | NOT NULL | Valor (sempre positivo) |
| `currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda |
| `exchange_rate` | DECIMAL(19,8) | NULL | Taxa de câmbio |
| `description` | VARCHAR(255) | NOT NULL | Descrição |
| `notes` | TEXT | NULL | Observações |
| `date` | DATE | NOT NULL | Data da transação |
| `competence_date` | DATE | NULL | Data de competência |
| `account_id` | VARCHAR(25) | FK → accounts | Conta origem |
| `to_account_id` | VARCHAR(25) | FK → accounts | Conta destino (transferência) |
| `category_id` | VARCHAR(25) | FK → categories | Categoria |
| `cost_center_id` | VARCHAR(25) | FK → cost_centers | Centro de custo |
| `project_id` | VARCHAR(25) | FK → projects | Projeto |
| `contact_id` | VARCHAR(25) | FK → contacts | Contato |
| `recurrence_type` | ENUM | NOT NULL, DEFAULT 'NONE' | Tipo de recorrência |
| `recurrence_end_date` | DATE | NULL | Fim da recorrência |
| `recurrence_parent_id` | VARCHAR(25) | FK → transactions | Transação pai |
| `attachments` | JSONB | NOT NULL, DEFAULT '[]' | URLs de anexos |
| `tags` | JSONB | NOT NULL, DEFAULT '[]' | Tags |
| `is_reconciled` | BOOLEAN | NOT NULL, DEFAULT false | Conciliado? |
| `reconciled_at` | TIMESTAMP | NULL | Data conciliação |
| `external_id` | VARCHAR(100) | NULL | ID externo (banco) |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `TransactionStatus`: PENDING, COMPLETED, CANCELLED
- `RecurrenceType`: NONE, DAILY, WEEKLY, BIWEEKLY, MONTHLY, BIMONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL

**Índices:**
- `transactions_organization_id_idx`
- `transactions_organization_id_date_idx`
- `transactions_organization_id_type_idx`
- `transactions_organization_id_category_id_idx`
- `transactions_organization_id_account_id_idx`
- `transactions_organization_id_status_idx`
- `transactions_account_id_date_idx`

---

### 8. cost_centers (Centros de Custo)

Centros de custo hierárquicos.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `parent_id` | VARCHAR(25) | FK → cost_centers | Centro pai |
| `name` | VARCHAR(100) | NOT NULL | Nome |
| `code` | VARCHAR(20) | NULL | Código interno |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT '#6366f1' | Cor |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Índices:**
- `cost_centers_organization_id_idx`
- `cost_centers_organization_id_code_key` (UNIQUE)

---

### 9. projects (Projetos)

Projetos para alocação de custos.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `name` | VARCHAR(100) | NOT NULL | Nome |
| `description` | TEXT | NULL | Descrição |
| `budget` | DECIMAL(19,4) | NULL | Orçamento |
| `currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda |
| `start_date` | DATE | NULL | Data início |
| `end_date` | DATE | NULL | Data fim |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT '#6366f1' | Cor |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT false | Arquivado? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

---

### 10. contacts (Contatos)

Clientes e fornecedores.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `name` | VARCHAR(100) | NOT NULL | Nome |
| `email` | VARCHAR(255) | NULL | Email |
| `phone` | VARCHAR(20) | NULL | Telefone |
| `tax_id` | VARCHAR(20) | NULL | CPF/CNPJ |
| `address` | VARCHAR(255) | NULL | Endereço |
| `city` | VARCHAR(100) | NULL | Cidade |
| `state` | VARCHAR(50) | NULL | Estado |
| `postal_code` | VARCHAR(10) | NULL | CEP |
| `country` | VARCHAR(2) | NOT NULL, DEFAULT 'BR' | País |
| `is_customer` | BOOLEAN | NOT NULL, DEFAULT false | É cliente? |
| `is_supplier` | BOOLEAN | NOT NULL, DEFAULT false | É fornecedor? |
| `notes` | TEXT | NULL | Observações |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

---

### 11. goals (Metas)

Metas de orçamento, investimento e economia.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `name` | VARCHAR(100) | NOT NULL | Nome da meta |
| `type` | ENUM | NOT NULL | Tipo da meta |
| `target_amount` | DECIMAL(19,4) | NOT NULL | Valor alvo |
| `currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda |
| `start_date` | DATE | NOT NULL | Data início |
| `end_date` | DATE | NOT NULL | Data fim |
| `category_id` | VARCHAR(25) | FK → categories | Categoria (opcional) |
| `cost_center_id` | VARCHAR(25) | FK → cost_centers | Centro de custo (opcional) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `GoalType`: BUDGET, INVESTMENT, SAVINGS

---

### 12. assets (Ativos de Investimento)

Ativos financeiros cadastrados.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `ticker` | VARCHAR(20) | NOT NULL | Código (PETR4, BTC) |
| `name` | VARCHAR(255) | NOT NULL | Nome completo |
| `asset_class` | ENUM | NOT NULL | Classe do ativo |
| `currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda |
| `issuer` | VARCHAR(100) | NULL | Emissor (renda fixa) |
| `maturity_date` | DATE | NULL | Vencimento |
| `indexer` | VARCHAR(20) | NULL | Indexador (CDI, IPCA) |
| `rate` | DECIMAL(10,6) | NULL | Taxa contratada |
| `address` | VARCHAR(255) | NULL | Endereço (imóveis) |
| `registration_number` | VARCHAR(50) | NULL | Matrícula (imóveis) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo? |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `AssetClass`: STOCK, OPTION, FII, ETF, BDR, SUBSCRIPTION, CDB, LCI, LCA, TREASURY, DEBENTURE, FUND, PENSION, FUTURE_DOL, FUTURE_WDO, FUTURE_IND, FUTURE_WIN, FUTURE_OTHER, STOCK_US, REIT, ETF_INTL, CRYPTO, FOREX, REAL_ESTATE, VEHICLE, PRECIOUS_METAL, OTHER

**Índices:**
- `assets_organization_id_idx`
- `assets_organization_id_asset_class_idx`
- `assets_organization_id_ticker_asset_class_key` (UNIQUE)

---

### 13. asset_operations (Operações de Ativos)

Compras, vendas, dividendos, etc.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `asset_id` | VARCHAR(25) | FK → assets | Ativo |
| `operation_type` | ENUM | NOT NULL | Tipo de operação |
| `date` | DATE | NOT NULL | Data da operação |
| `quantity` | DECIMAL(19,8) | NOT NULL | Quantidade |
| `unit_price` | DECIMAL(19,8) | NOT NULL | Preço unitário |
| `total_amount` | DECIMAL(19,4) | NOT NULL | Valor total |
| `currency` | ENUM | NOT NULL, DEFAULT 'BRL' | Moeda |
| `brokerage_fee` | DECIMAL(19,4) | NOT NULL, DEFAULT 0 | Taxa corretagem |
| `other_fees` | DECIMAL(19,4) | NOT NULL, DEFAULT 0 | Outras taxas |
| `taxes` | DECIMAL(19,4) | NOT NULL, DEFAULT 0 | Impostos retidos |
| `strike_price` | DECIMAL(19,4) | NULL | Strike (opções) |
| `expiration_date` | DATE | NULL | Vencimento (opções) |
| `notes` | TEXT | NULL | Observações |
| `external_ref` | VARCHAR(100) | NULL | Referência externa |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

**Enums:**
- `OperationType`: BUY, SELL, DIVIDEND, JCP, BONUS, SPLIT, INPLIT, SUBSCRIPTION, AMORTIZATION, INCOME, EXERCISE, TRANSFER_IN, TRANSFER_OUT, FEE, TAX

**Índices:**
- `asset_operations_organization_id_idx`
- `asset_operations_organization_id_date_idx`
- `asset_operations_asset_id_idx`
- `asset_operations_asset_id_date_idx`

---

### 14. audit_logs (Logs de Auditoria)

Registro imutável de todas as ações.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `organization_id` | VARCHAR(25) | FK → organizations | Organização |
| `user_id` | VARCHAR(25) | FK → users | Usuário |
| `action` | VARCHAR(50) | NOT NULL | Ação (CREATE, UPDATE, DELETE) |
| `entity_type` | VARCHAR(50) | NOT NULL | Tipo de entidade |
| `entity_id` | VARCHAR(25) | NULL | ID da entidade |
| `old_values` | JSONB | NULL | Valores anteriores |
| `new_values` | JSONB | NULL | Novos valores |
| `ip_address` | VARCHAR(45) | NULL | IP do usuário |
| `user_agent` | VARCHAR(500) | NULL | Navegador |
| `created_at` | TIMESTAMP | NOT NULL | Data/hora (imutável) |

**Índices:**
- `audit_logs_organization_id_idx`
- `audit_logs_organization_id_entity_type_idx`
- `audit_logs_organization_id_created_at_idx`
- `audit_logs_user_id_idx`

---

### 15. benchmark_indexes (Índices de Benchmark)

Índices para comparação de rentabilidade.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `code` | VARCHAR(20) | NOT NULL, UNIQUE | Código (CDI, IPCA, IBOV) |
| `name` | VARCHAR(100) | NOT NULL | Nome completo |
| `created_at` | TIMESTAMP | NOT NULL | Criação |
| `updated_at` | TIMESTAMP | NOT NULL | Atualização |

---

### 16. benchmark_values (Valores de Benchmark)

Valores históricos dos índices.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `index_id` | VARCHAR(25) | FK → benchmark_indexes | Índice |
| `date` | DATE | NOT NULL | Data |
| `value` | DECIMAL(19,8) | NOT NULL | Valor |
| `created_at` | TIMESTAMP | NOT NULL | Criação |

**Índices:**
- `benchmark_values_index_id_idx`
- `benchmark_values_index_id_date_key` (UNIQUE)

---

### 17. asset_quotes (Cotações de Ativos)

Cotações históricas de ativos.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `ticker` | VARCHAR(20) | NOT NULL | Código do ativo |
| `date` | DATE | NOT NULL | Data |
| `open` | DECIMAL(19,8) | NULL | Abertura |
| `high` | DECIMAL(19,8) | NULL | Máxima |
| `low` | DECIMAL(19,8) | NULL | Mínima |
| `close` | DECIMAL(19,8) | NOT NULL | Fechamento |
| `volume` | DECIMAL(19,2) | NULL | Volume |
| `created_at` | TIMESTAMP | NOT NULL | Criação |

**Índices:**
- `asset_quotes_ticker_idx`
- `asset_quotes_ticker_date_key` (UNIQUE)

---

### 18. exchange_rates (Taxas de Câmbio)

Taxas de câmbio históricas.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | VARCHAR(25) | PK | ID único |
| `from_currency` | ENUM | NOT NULL | Moeda origem |
| `to_currency` | ENUM | NOT NULL | Moeda destino |
| `date` | DATE | NOT NULL | Data |
| `rate` | DECIMAL(19,8) | NOT NULL | Taxa |
| `created_at` | TIMESTAMP | NOT NULL | Criação |

**Índices:**
- `exchange_rates_from_currency_to_currency_idx`
- `exchange_rates_from_currency_to_currency_date_key` (UNIQUE)

---

## Enums Globais

### Currency (Moedas)
```sql
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR');
```

### AccountType (Tipos de Conta)
```sql
CREATE TYPE "AccountType" AS ENUM (
  'CHECKING',      -- Conta Corrente
  'SAVINGS',       -- Poupança
  'INVESTMENT',    -- Conta de Investimento
  'CREDIT_CARD',   -- Cartão de Crédito
  'CASH',          -- Dinheiro
  'DIGITAL_WALLET',-- Carteira Digital
  'OTHER'          -- Outros
);
```

### TransactionType (Tipos de Transação)
```sql
CREATE TYPE "TransactionType" AS ENUM (
  'INCOME',   -- Receita
  'EXPENSE',  -- Despesa
  'TRANSFER'  -- Transferência
);
```

### TransactionStatus (Status de Transação)
```sql
CREATE TYPE "TransactionStatus" AS ENUM (
  'PENDING',   -- Pendente/Agendado
  'COMPLETED', -- Efetivado
  'CANCELLED'  -- Cancelado
);
```

### RecurrenceType (Tipos de Recorrência)
```sql
CREATE TYPE "RecurrenceType" AS ENUM (
  'NONE',       -- Sem recorrência
  'DAILY',      -- Diário
  'WEEKLY',     -- Semanal
  'BIWEEKLY',   -- Quinzenal
  'MONTHLY',    -- Mensal
  'BIMONTHLY',  -- Bimestral
  'QUARTERLY',  -- Trimestral
  'SEMIANNUAL', -- Semestral
  'ANNUAL'      -- Anual
);
```

---

## Como Criar as Tabelas

### Opção 1: Usando Prisma (Recomendado)

```bash
# Configure a DATABASE_URL no .env
cp .env.example .env
# Edite .env com sua conexão PostgreSQL

# Gere o cliente Prisma
npx prisma generate

# Crie as tabelas (desenvolvimento)
npx prisma db push

# OU use migrations (produção)
npx prisma migrate dev --name init
```

### Opção 2: Usando Docker Compose

```bash
# Inicia PostgreSQL + Redis + App
docker compose up -d

# As migrations serão executadas automaticamente
```

### Opção 3: SQL Direto

Execute o arquivo de migrations gerado pelo Prisma:
```bash
npx prisma migrate dev --name init --create-only
# O SQL estará em prisma/migrations/
```

---

## Configuração do PostgreSQL

### Recomendações de Performance

```sql
-- Extensões recomendadas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para buscas fuzzy

-- Configurações de locale para ordenação correta em pt-BR
ALTER DATABASE finance_control SET lc_collate = 'pt_BR.UTF-8';
ALTER DATABASE finance_control SET lc_ctype = 'pt_BR.UTF-8';
```

### Usuário de Aplicação

```sql
-- Criar usuário com permissões limitadas (produção)
CREATE USER finance_app WITH PASSWORD 'senha_segura';
GRANT CONNECT ON DATABASE finance_control TO finance_app;
GRANT USAGE ON SCHEMA public TO finance_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO finance_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finance_app;
```

---

## Backup e Restauração

```bash
# Backup
pg_dump -h localhost -U postgres -d finance_control -F c -f backup.dump

# Restauração
pg_restore -h localhost -U postgres -d finance_control -c backup.dump
```
