-- ============================================
-- Finance Control - Database Schema
-- PostgreSQL 16+
-- ============================================
-- Execute este script para criar todas as tabelas
-- psql -h localhost -U postgres -d finance_control -f db.sql
-- ============================================

-- Criar banco de dados (execute separadamente se necessário)
-- CREATE DATABASE finance_control WITH ENCODING 'UTF8' LC_COLLATE 'pt_BR.UTF-8' LC_CTYPE 'pt_BR.UTF-8';

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR');

CREATE TYPE "AccountType" AS ENUM (
    'CHECKING',
    'SAVINGS',
    'INVESTMENT',
    'CREDIT_CARD',
    'CASH',
    'DIGITAL_WALLET',
    'OTHER'
);

CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TYPE "RecurrenceType" AS ENUM (
    'NONE',
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'BIMONTHLY',
    'QUARTERLY',
    'SEMIANNUAL',
    'ANNUAL'
);

CREATE TYPE "AssetClass" AS ENUM (
    'STOCK',
    'OPTION',
    'FII',
    'ETF',
    'BDR',
    'SUBSCRIPTION',
    'CDB',
    'LCI',
    'LCA',
    'TREASURY',
    'DEBENTURE',
    'FUND',
    'PENSION',
    'FUTURE_DOL',
    'FUTURE_WDO',
    'FUTURE_IND',
    'FUTURE_WIN',
    'FUTURE_OTHER',
    'STOCK_US',
    'REIT',
    'ETF_INTL',
    'CRYPTO',
    'FOREX',
    'REAL_ESTATE',
    'VEHICLE',
    'PRECIOUS_METAL',
    'OTHER'
);

CREATE TYPE "OperationType" AS ENUM (
    'BUY',
    'SELL',
    'DIVIDEND',
    'JCP',
    'BONUS',
    'SPLIT',
    'INPLIT',
    'SUBSCRIPTION',
    'AMORTIZATION',
    'INCOME',
    'EXERCISE',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'FEE',
    'TAX'
);

CREATE TYPE "GoalType" AS ENUM ('BUDGET', 'INVESTMENT', 'SAVINGS');

CREATE TYPE "OrganizationType" AS ENUM ('PERSONAL', 'BUSINESS');

CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- ============================================
-- TABELAS
-- ============================================

-- 1. Users (Usuários)
CREATE TABLE users (
    id VARCHAR(25) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    default_currency "Currency" NOT NULL DEFAULT 'BRL',
    locale VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX users_email_idx ON users(email);

-- 2. Sessions (Sessões)
CREATE TABLE sessions (
    id VARCHAR(25) PRIMARY KEY,
    user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_token_idx ON sessions(token);

-- 3. Organizations (Organizações)
CREATE TABLE organizations (
    id VARCHAR(25) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type "OrganizationType" NOT NULL DEFAULT 'PERSONAL',
    default_currency "Currency" NOT NULL DEFAULT 'BRL',
    fiscal_year_start INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
    tax_id VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Organization Members (Membros da Organização)
CREATE TABLE organization_members (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role "UserRole" NOT NULL DEFAULT 'MEMBER',
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX organization_members_user_id_idx ON organization_members(user_id);

-- 5. Accounts (Contas Financeiras)
CREATE TABLE accounts (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type "AccountType" NOT NULL,
    currency "Currency" NOT NULL DEFAULT 'BRL',
    initial_balance DECIMAL(19,4) NOT NULL DEFAULT 0,
    initial_date DATE NOT NULL DEFAULT CURRENT_DATE,
    credit_limit DECIMAL(19,4),
    closing_day INTEGER CHECK (closing_day IS NULL OR (closing_day >= 1 AND closing_day <= 28)),
    due_day INTEGER CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 28)),
    bank_code VARCHAR(10),
    agency_number VARCHAR(20),
    account_number VARCHAR(30),
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(50) NOT NULL DEFAULT 'wallet',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX accounts_organization_id_idx ON accounts(organization_id);
CREATE INDEX accounts_organization_id_type_idx ON accounts(organization_id, type);

-- 6. Categories (Categorias)
CREATE TABLE categories (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id VARCHAR(25) REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    type "TransactionType" NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(50) NOT NULL DEFAULT 'tag',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, parent_id, name)
);

CREATE INDEX categories_organization_id_idx ON categories(organization_id);
CREATE INDEX categories_organization_id_type_idx ON categories(organization_id, type);

-- 7. Cost Centers (Centros de Custo)
CREATE TABLE cost_centers (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id VARCHAR(25) REFERENCES cost_centers(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX cost_centers_organization_id_idx ON cost_centers(organization_id);

-- 8. Projects (Projetos)
CREATE TABLE projects (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget DECIMAL(19,4),
    currency "Currency" NOT NULL DEFAULT 'BRL',
    start_date DATE,
    end_date DATE,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX projects_organization_id_idx ON projects(organization_id);

-- 9. Contacts (Contatos - Clientes e Fornecedores)
CREATE TABLE contacts (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    tax_id VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(10),
    country VARCHAR(2) NOT NULL DEFAULT 'BR',
    is_customer BOOLEAN NOT NULL DEFAULT false,
    is_supplier BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX contacts_organization_id_idx ON contacts(organization_id);
CREATE INDEX contacts_organization_id_is_customer_idx ON contacts(organization_id, is_customer);
CREATE INDEX contacts_organization_id_is_supplier_idx ON contacts(organization_id, is_supplier);

-- 10. Transactions (Transações)
CREATE TABLE transactions (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type "TransactionType" NOT NULL,
    status "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    amount DECIMAL(19,4) NOT NULL CHECK (amount > 0),
    currency "Currency" NOT NULL DEFAULT 'BRL',
    exchange_rate DECIMAL(19,8),
    description VARCHAR(255) NOT NULL,
    notes TEXT,
    date DATE NOT NULL,
    competence_date DATE,
    account_id VARCHAR(25) NOT NULL REFERENCES accounts(id),
    to_account_id VARCHAR(25) REFERENCES accounts(id),
    category_id VARCHAR(25) NOT NULL REFERENCES categories(id),
    cost_center_id VARCHAR(25) REFERENCES cost_centers(id),
    project_id VARCHAR(25) REFERENCES projects(id),
    contact_id VARCHAR(25) REFERENCES contacts(id),
    recurrence_type "RecurrenceType" NOT NULL DEFAULT 'NONE',
    recurrence_end_date DATE,
    recurrence_parent_id VARCHAR(25) REFERENCES transactions(id),
    attachments JSONB NOT NULL DEFAULT '[]',
    tags JSONB NOT NULL DEFAULT '[]',
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    reconciled_at TIMESTAMP,
    external_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Validações
    CONSTRAINT transactions_transfer_check CHECK (
        (type = 'TRANSFER' AND to_account_id IS NOT NULL AND account_id != to_account_id)
        OR (type != 'TRANSFER')
    ),
    CONSTRAINT transactions_recurrence_check CHECK (
        recurrence_end_date IS NULL OR recurrence_end_date >= date
    )
);

CREATE INDEX transactions_organization_id_idx ON transactions(organization_id);
CREATE INDEX transactions_organization_id_date_idx ON transactions(organization_id, date);
CREATE INDEX transactions_organization_id_type_idx ON transactions(organization_id, type);
CREATE INDEX transactions_organization_id_category_id_idx ON transactions(organization_id, category_id);
CREATE INDEX transactions_organization_id_account_id_idx ON transactions(organization_id, account_id);
CREATE INDEX transactions_organization_id_status_idx ON transactions(organization_id, status);
CREATE INDEX transactions_account_id_date_idx ON transactions(account_id, date);

-- 11. Goals (Metas)
CREATE TABLE goals (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type "GoalType" NOT NULL,
    target_amount DECIMAL(19,4) NOT NULL,
    currency "Currency" NOT NULL DEFAULT 'BRL',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    category_id VARCHAR(25) REFERENCES categories(id),
    cost_center_id VARCHAR(25) REFERENCES cost_centers(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT goals_date_check CHECK (end_date >= start_date)
);

CREATE INDEX goals_organization_id_idx ON goals(organization_id);
CREATE INDEX goals_organization_id_type_idx ON goals(organization_id, type);

-- 12. Assets (Ativos de Investimento)
CREATE TABLE assets (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    asset_class "AssetClass" NOT NULL,
    currency "Currency" NOT NULL DEFAULT 'BRL',
    issuer VARCHAR(100),
    maturity_date DATE,
    indexer VARCHAR(20),
    rate DECIMAL(10,6),
    address VARCHAR(255),
    registration_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, ticker, asset_class)
);

CREATE INDEX assets_organization_id_idx ON assets(organization_id);
CREATE INDEX assets_organization_id_asset_class_idx ON assets(organization_id, asset_class);

-- 13. Asset Operations (Operações de Ativos)
CREATE TABLE asset_operations (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id VARCHAR(25) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    operation_type "OperationType" NOT NULL,
    date DATE NOT NULL,
    quantity DECIMAL(19,8) NOT NULL,
    unit_price DECIMAL(19,8) NOT NULL,
    total_amount DECIMAL(19,4) NOT NULL,
    currency "Currency" NOT NULL DEFAULT 'BRL',
    brokerage_fee DECIMAL(19,4) NOT NULL DEFAULT 0,
    other_fees DECIMAL(19,4) NOT NULL DEFAULT 0,
    taxes DECIMAL(19,4) NOT NULL DEFAULT 0,
    strike_price DECIMAL(19,4),
    expiration_date DATE,
    notes TEXT,
    external_ref VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX asset_operations_organization_id_idx ON asset_operations(organization_id);
CREATE INDEX asset_operations_organization_id_date_idx ON asset_operations(organization_id, date);
CREATE INDEX asset_operations_asset_id_idx ON asset_operations(asset_id);
CREATE INDEX asset_operations_asset_id_date_idx ON asset_operations(asset_id, date);

-- 14. Audit Logs (Logs de Auditoria)
CREATE TABLE audit_logs (
    id VARCHAR(25) PRIMARY KEY,
    organization_id VARCHAR(25) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(25) NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(25),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_logs_organization_id_idx ON audit_logs(organization_id);
CREATE INDEX audit_logs_organization_id_entity_type_idx ON audit_logs(organization_id, entity_type);
CREATE INDEX audit_logs_organization_id_created_at_idx ON audit_logs(organization_id, created_at);
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);

-- 15. Benchmark Indexes (Índices de Benchmark)
CREATE TABLE benchmark_indexes (
    id VARCHAR(25) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Benchmark Values (Valores de Benchmark)
CREATE TABLE benchmark_values (
    id VARCHAR(25) PRIMARY KEY,
    index_id VARCHAR(25) NOT NULL REFERENCES benchmark_indexes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value DECIMAL(19,8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(index_id, date)
);

CREATE INDEX benchmark_values_index_id_idx ON benchmark_values(index_id);
CREATE INDEX benchmark_values_index_id_date_idx ON benchmark_values(index_id, date);

-- 17. Asset Quotes (Cotações de Ativos)
CREATE TABLE asset_quotes (
    id VARCHAR(25) PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(19,8),
    high DECIMAL(19,8),
    low DECIMAL(19,8),
    close DECIMAL(19,8) NOT NULL,
    volume DECIMAL(19,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, date)
);

CREATE INDEX asset_quotes_ticker_idx ON asset_quotes(ticker);
CREATE INDEX asset_quotes_ticker_date_idx ON asset_quotes(ticker, date);

-- 18. Exchange Rates (Taxas de Câmbio)
CREATE TABLE exchange_rates (
    id VARCHAR(25) PRIMARY KEY,
    from_currency "Currency" NOT NULL,
    to_currency "Currency" NOT NULL,
    date DATE NOT NULL,
    rate DECIMAL(19,8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency, date)
);

CREATE INDEX exchange_rates_currencies_idx ON exchange_rates(from_currency, to_currency);
CREATE INDEX exchange_rates_currencies_date_idx ON exchange_rates(from_currency, to_currency, date);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_operations_updated_at BEFORE UPDATE ON asset_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benchmark_indexes_updated_at BEFORE UPDATE ON benchmark_indexes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- ============================================
-- USUÁRIO ADMINISTRADOR PADRÃO
-- ============================================
-- Email: admin@financecontrol.com
-- Senha: Admin@123 (troque em produção!)
-- ============================================

-- Usuário admin
INSERT INTO users (id, email, password_hash, name, email_verified, default_currency) VALUES
    ('usr_admin_default', 'admin@financecontrol.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.oSoXmZPJ5WKhGy', 'Administrador', true, 'BRL');

-- Organização pessoal do admin
INSERT INTO organizations (id, name, type, default_currency) VALUES
    ('org_admin_default', 'Minhas Finanças', 'PERSONAL', 'BRL');

-- Vincular usuário à organização como owner
INSERT INTO organization_members (id, organization_id, user_id, role) VALUES
    ('mem_admin_default', 'org_admin_default', 'usr_admin_default', 'OWNER');

-- Categorias padrão de RECEITA
INSERT INTO categories (id, organization_id, name, type, color, icon, sort_order, is_system) VALUES
    ('cat_income_salary', 'org_admin_default', 'Salário', 'INCOME', '#22c55e', 'briefcase', 1, true),
    ('cat_income_invest', 'org_admin_default', 'Investimentos', 'INCOME', '#3b82f6', 'trending-up', 2, true),
    ('cat_income_freelance', 'org_admin_default', 'Freelance', 'INCOME', '#8b5cf6', 'laptop', 3, true),
    ('cat_income_sales', 'org_admin_default', 'Vendas', 'INCOME', '#f59e0b', 'shopping-bag', 4, true),
    ('cat_income_rent', 'org_admin_default', 'Aluguéis', 'INCOME', '#06b6d4', 'home', 5, true),
    ('cat_income_other', 'org_admin_default', 'Outras Receitas', 'INCOME', '#64748b', 'plus-circle', 99, true);

-- Categorias padrão de DESPESA
INSERT INTO categories (id, organization_id, name, type, color, icon, sort_order, is_system) VALUES
    ('cat_expense_housing', 'org_admin_default', 'Moradia', 'EXPENSE', '#ef4444', 'home', 1, true),
    ('cat_expense_food', 'org_admin_default', 'Alimentação', 'EXPENSE', '#f97316', 'utensils', 2, true),
    ('cat_expense_transport', 'org_admin_default', 'Transporte', 'EXPENSE', '#eab308', 'car', 3, true),
    ('cat_expense_health', 'org_admin_default', 'Saúde', 'EXPENSE', '#ec4899', 'heart', 4, true),
    ('cat_expense_education', 'org_admin_default', 'Educação', 'EXPENSE', '#8b5cf6', 'graduation-cap', 5, true),
    ('cat_expense_leisure', 'org_admin_default', 'Lazer', 'EXPENSE', '#06b6d4', 'gamepad-2', 6, true),
    ('cat_expense_clothing', 'org_admin_default', 'Vestuário', 'EXPENSE', '#14b8a6', 'shirt', 7, true),
    ('cat_expense_services', 'org_admin_default', 'Serviços', 'EXPENSE', '#6366f1', 'wrench', 8, true),
    ('cat_expense_taxes', 'org_admin_default', 'Impostos', 'EXPENSE', '#dc2626', 'file-text', 9, true),
    ('cat_expense_other', 'org_admin_default', 'Outras Despesas', 'EXPENSE', '#64748b', 'minus-circle', 99, true);

-- Conta bancária padrão
INSERT INTO accounts (id, organization_id, name, type, currency, initial_balance, color, icon) VALUES
    ('acc_checking_default', 'org_admin_default', 'Conta Corrente', 'CHECKING', 'BRL', 0, '#6366f1', 'building-2'),
    ('acc_savings_default', 'org_admin_default', 'Poupança', 'SAVINGS', 'BRL', 0, '#22c55e', 'piggy-bank'),
    ('acc_cash_default', 'org_admin_default', 'Carteira', 'CASH', 'BRL', 0, '#f59e0b', 'wallet');

-- Índices de benchmark padrão
INSERT INTO benchmark_indexes (id, code, name) VALUES
    ('idx_cdi', 'CDI', 'Certificado de Depósito Interbancário'),
    ('idx_ipca', 'IPCA', 'Índice de Preços ao Consumidor Amplo'),
    ('idx_igpm', 'IGPM', 'Índice Geral de Preços do Mercado'),
    ('idx_selic', 'SELIC', 'Sistema Especial de Liquidação e Custódia'),
    ('idx_ibov', 'IBOV', 'Índice Bovespa'),
    ('idx_ifix', 'IFIX', 'Índice de Fundos de Investimento Imobiliário'),
    ('idx_smll', 'SMLL', 'Índice Small Cap'),
    ('idx_sp500', 'SP500', 'S&P 500'),
    ('idx_nasdaq', 'NASDAQ', 'NASDAQ Composite'),
    ('idx_dolar', 'USD', 'Dólar Americano'),
    ('idx_euro', 'EUR', 'Euro'),
    ('idx_poup', 'POUPANCA', 'Poupança');

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Saldo atual das contas
CREATE VIEW v_account_balances AS
SELECT
    a.id AS account_id,
    a.organization_id,
    a.name AS account_name,
    a.type AS account_type,
    a.currency,
    a.initial_balance,
    COALESCE(SUM(
        CASE
            WHEN t.type = 'INCOME' THEN t.amount
            WHEN t.type = 'EXPENSE' THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.to_account_id = a.id THEN t.amount
            ELSE 0
        END
    ), 0) AS transactions_total,
    a.initial_balance + COALESCE(SUM(
        CASE
            WHEN t.type = 'INCOME' THEN t.amount
            WHEN t.type = 'EXPENSE' THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.to_account_id = a.id THEN t.amount
            ELSE 0
        END
    ), 0) AS current_balance
FROM accounts a
LEFT JOIN transactions t ON (
    (t.account_id = a.id OR t.to_account_id = a.id)
    AND t.status = 'COMPLETED'
    AND t.date <= CURRENT_DATE
)
WHERE a.is_active = true AND a.is_archived = false
GROUP BY a.id, a.organization_id, a.name, a.type, a.currency, a.initial_balance;

-- View: Resumo mensal por categoria
CREATE VIEW v_monthly_category_totals AS
SELECT
    t.organization_id,
    DATE_TRUNC('month', t.date) AS month,
    c.id AS category_id,
    c.name AS category_name,
    c.type AS category_type,
    t.currency,
    SUM(t.amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.status = 'COMPLETED'
GROUP BY t.organization_id, DATE_TRUNC('month', t.date), c.id, c.name, c.type, t.currency;

-- View: Posição consolidada de investimentos
CREATE VIEW v_investment_positions AS
SELECT
    a.organization_id,
    a.id AS asset_id,
    a.ticker,
    a.name AS asset_name,
    a.asset_class,
    a.currency,
    SUM(CASE WHEN op.operation_type IN ('BUY', 'BONUS', 'TRANSFER_IN', 'SUBSCRIPTION') THEN op.quantity ELSE 0 END) -
    SUM(CASE WHEN op.operation_type IN ('SELL', 'TRANSFER_OUT', 'EXERCISE') THEN op.quantity ELSE 0 END) AS quantity,
    SUM(CASE WHEN op.operation_type IN ('BUY', 'SUBSCRIPTION') THEN op.total_amount + op.brokerage_fee + op.other_fees ELSE 0 END) -
    SUM(CASE WHEN op.operation_type = 'SELL' THEN op.total_amount - op.brokerage_fee - op.other_fees - op.taxes ELSE 0 END) AS total_cost,
    SUM(CASE WHEN op.operation_type IN ('DIVIDEND', 'JCP', 'INCOME', 'AMORTIZATION') THEN op.total_amount ELSE 0 END) AS total_income
FROM assets a
LEFT JOIN asset_operations op ON a.id = op.asset_id
WHERE a.is_active = true
GROUP BY a.organization_id, a.id, a.ticker, a.name, a.asset_class, a.currency
HAVING SUM(CASE WHEN op.operation_type IN ('BUY', 'BONUS', 'TRANSFER_IN', 'SUBSCRIPTION') THEN op.quantity ELSE 0 END) -
       SUM(CASE WHEN op.operation_type IN ('SELL', 'TRANSFER_OUT', 'EXERCISE') THEN op.quantity ELSE 0 END) > 0;

-- ============================================
-- PERMISSÕES (ajuste conforme necessário)
-- ============================================

-- Criar usuário de aplicação (opcional)
-- CREATE USER finance_app WITH PASSWORD 'sua_senha_segura';
-- GRANT CONNECT ON DATABASE finance_control TO finance_app;
-- GRANT USAGE ON SCHEMA public TO finance_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO finance_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finance_app;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
