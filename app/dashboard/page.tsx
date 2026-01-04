'use client';

import { DashboardLayout } from '../components/DashboardLayout';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Visão Geral
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumo das suas finanças
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Saldo Total"
          value="R$ 0,00"
          change="+0%"
          changeType="neutral"
          icon={<WalletIcon />}
        />
        <SummaryCard
          title="Receitas (mês)"
          value="R$ 0,00"
          change="+0%"
          changeType="positive"
          icon={<ArrowUpIcon />}
        />
        <SummaryCard
          title="Despesas (mês)"
          value="R$ 0,00"
          change="+0%"
          changeType="negative"
          icon={<ArrowDownIcon />}
        />
        <SummaryCard
          title="Investimentos"
          value="R$ 0,00"
          change="+0%"
          changeType="neutral"
          icon={<ChartIcon />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Últimas Transações
              </h2>
              <Link
                href="/transactions"
                className="text-sm text-primary hover:text-primary/80"
              >
                Ver todas
              </Link>
            </div>
            <div className="p-4">
              <EmptyState
                message="Nenhuma transação registrada"
                actionLabel="Adicionar transação"
                actionHref="/transactions/new"
              />
            </div>
          </div>

          {/* Cashflow Chart Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fluxo de Caixa
              </h2>
              <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Últimos 30 dias</option>
                <option>Últimos 60 dias</option>
                <option>Últimos 90 dias</option>
              </select>
            </div>
            <div className="p-4 h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Gráfico de fluxo de caixa será exibido aqui</p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ações Rápidas
            </h2>
            <div className="space-y-2">
              <QuickActionButton
                label="Nova Transação"
                icon={<PlusIcon />}
                href="/transactions/new"
              />
              <QuickActionButton
                label="Nova Conta"
                icon={<BankIcon />}
                href="/accounts/new"
              />
              <QuickActionButton
                label="Novo Investimento"
                icon={<ChartIcon />}
                href="/investments/new"
              />
              <QuickActionButton
                label="Importar OFX/CSV"
                icon={<UploadIcon />}
                href="/import"
              />
            </div>
          </div>

          {/* Upcoming Bills */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Próximas Contas
              </h2>
              <Link
                href="/payables"
                className="text-sm text-primary hover:text-primary/80"
              >
                Ver todas
              </Link>
            </div>
            <div className="p-4">
              <EmptyState
                message="Nenhuma conta a pagar"
                actionLabel="Adicionar conta"
                actionHref="/payables/new"
              />
            </div>
          </div>

          {/* Budget Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Orçamento do Mês
              </h2>
              <Link
                href="/budget"
                className="text-sm text-primary hover:text-primary/80"
              >
                Configurar
              </Link>
            </div>
            <div className="p-4">
              <EmptyState
                message="Orçamento não configurado"
                actionLabel="Criar orçamento"
                actionHref="/budget"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  change,
  changeType,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}) {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <span className={`text-xs font-medium ${changeColors[changeType]}`}>
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
        {value}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
    </div>
  );
}

function QuickActionButton({
  label,
  icon,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </Link>
  );
}

function EmptyState({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="text-center py-6">
      <p className="text-gray-500 dark:text-gray-400 mb-3">{message}</p>
      <Link
        href={actionHref}
        className="inline-block px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

// Icons
function WalletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m19 12-7 7-7-7" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M5 6l7-3 7 3" />
      <path d="M4 10v11" />
      <path d="M20 10v11" />
      <path d="M8 14v3" />
      <path d="M12 14v3" />
      <path d="M16 14v3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
