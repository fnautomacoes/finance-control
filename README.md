# Finance Control

Plataforma completa de gestão financeira e investimentos.

## Visão Geral

O Finance Control é uma solução de gestão financeira desenvolvida para atender pessoas físicas, profissionais liberais, pequenas empresas e investidores. A plataforma oferece:

- **Gestão Pessoal**: Controle de contas, cartões, metas financeiras e Carnê Leão
- **Gestão Empresarial**: DRE/DFC gerenciais, balanço patrimonial, centros de custos
- **Investimentos**: Carteira diversificada com cálculo automático de IR

## Tecnologias

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes / Server Actions
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: JWT com suporte a MFA
- **Estilização**: Tailwind CSS
- **Testes**: Vitest, Testing Library, Playwright

## Arquitetura

O projeto segue os princípios de **Domain-Driven Design (DDD)** com a seguinte estrutura:

```
src/
├── domain/           # Entidades, Value Objects, Regras de Negócio
│   ├── core/         # Componentes compartilhados (Money, Entity base)
│   ├── account/      # Domínio de Contas
│   ├── transaction/  # Domínio de Transações
│   ├── category/     # Domínio de Categorias
│   ├── investment/   # Domínio de Investimentos
│   └── tax/          # Domínio de Impostos
├── application/      # Use Cases, DTOs, Mappers
├── infrastructure/   # Implementações técnicas (DB, HTTP, etc)
├── presentation/     # Interface do usuário (Next.js App)
└── shared/          # Utilitários e tipos compartilhados
```

## Requisitos

- Node.js 20+
- PostgreSQL 16+
- Docker e Docker Compose (recomendado)

## Início Rápido

### Com Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/fnautomacoes/finance-control.git
cd finance-control

# Copie o arquivo de ambiente
cp .env.example .env

# Inicie os containers
docker compose up -d

# Acesse http://localhost:3000
```

### Sem Docker

```bash
# Instale as dependências
npm install

# Configure o banco de dados PostgreSQL e atualize o .env

# Execute as migrations
npm run db:migrate

# Inicie o servidor de desenvolvimento
npm run dev
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run test` | Executa testes |
| `npm run test:coverage` | Testes com cobertura |
| `npm run lint` | Verifica código |
| `npm run type-check` | Verifica tipos TypeScript |
| `npm run db:migrate` | Executa migrations |
| `npm run db:studio` | Abre Prisma Studio |

## Precisão Monetária

O Finance Control utiliza a biblioteca `Decimal.js` para garantir precisão absoluta em todos os cálculos monetários. O Value Object `Money` encapsula toda a lógica de operações financeiras:

```typescript
import { Money, money } from '@/domain/core/value-objects';

const price = money(99.99, 'BRL');
const tax = price.percentage(10);
const total = price.add(tax);

// Distribuição proporcional sem perda de centavos
const shares = total.allocate(3);
```

## Moedas Suportadas

- BRL (Real Brasileiro)
- USD (Dólar Americano)
- EUR (Euro)

## Conformidade Fiscal

O sistema implementa cálculos de Imposto de Renda conforme as instruções normativas da Receita Federal Brasileira, incluindo:

- IR sobre renda variável (ações, opções, FIIs)
- IR sobre renda fixa (CDB, LCI, LCA, Tesouro)
- Carnê Leão para profissionais liberais
- Relatórios de apoio para declaração anual

## Licença

Proprietary - Todos os direitos reservados.
