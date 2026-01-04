'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import Link from 'next/link';

interface DashboardData {
  summary: {
    totalPatrimony: number;
    totalBankBalance: number;
    totalInvestments: number;
    activeGoals: number;
    totalIncome: number;
    totalExpense: number;
  };
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    color: string;
  }>;
  cashResults: Array<{
    id: string;
    name: string;
    entradas: number;
    saidas: number;
    resultado: number;
    confirmedBalance: number;
    projectedBalance: number;
  }>;
  monthlyData: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  incomeByCategory: Array<{ name: string; value: number }>;
  expenseByCategory: Array<{ name: string; value: number }>;
  incomeByCostCenter: Array<{ name: string; value: number }>;
  expenseByCostCenter: Array<{ name: string; value: number }>;
  creditCards: Array<{
    id: string;
    name: string;
    color: string;
    limit: number;
    currentBalance: number;
    availableLimit: number;
    closingDay: number;
    dueDay: number;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
  }>;
  balanceSheet: {
    ativo: { disponivel: number; realizavel: number; total: number };
    passivo: { devedor: number; exigivel: number; total: number };
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (response.ok) {
          const result = await response.json();
          setData(result);
          // Select all accounts by default
          setSelectedAccounts(new Set(result.accounts.map((a: { id: string }) => a.id)));
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  // Calculate totals based on selected accounts
  const selectedCashResults = data?.cashResults.filter(cr => selectedAccounts.has(cr.id)) || [];
  const totalConfirmed = selectedCashResults.reduce((sum, cr) => sum + cr.confirmedBalance, 0);
  const totalProjected = selectedCashResults.reduce((sum, cr) => sum + cr.projectedBalance, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          Visão geral
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
          Bem-vindo ao FinanceControl
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard
          title="Patrimônio Total"
          value={formatCurrency(data?.summary.totalPatrimony || 0)}
          subtitle="Contas + Investimentos"
          href="/reports/patrimony"
        />
        <SummaryCard
          title="Contas Bancárias"
          value={formatCurrency(data?.summary.totalBankBalance || 0)}
          subtitle={`${data?.accounts.length || 0} contas`}
          href="/accounts"
        />
        <SummaryCard
          title="Investimentos"
          value={formatCurrency(data?.summary.totalInvestments || 0)}
          subtitle="12 ativos"
          href="/investments"
        />
        <SummaryCard
          title="Metas"
          value={String(data?.summary.activeGoals || 0)}
          subtitle="Metas ativas"
          href="/budget"
        />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Metas de Despesas */}
        <Card title="Metas de despesas" subtitle="Situação projetada" href="/budget">
          {data?.goals.slice(0, 4).map((goal) => (
            <GoalProgress
              key={goal.id}
              name={goal.name}
              current={goal.currentAmount}
              target={goal.targetAmount}
              color="#f59e0b"
            />
          )) || <EmptyMessage>Nenhuma meta cadastrada</EmptyMessage>}
        </Card>

        {/* Saldos de Caixa */}
        <Card title="Saldos de caixa" href="/accounts">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', fontSize: '12px', color: '#6b7280', marginBottom: '8px', paddingRight: '8px' }}>
            <span></span>
            <span style={{ textAlign: 'right' }}>Confirmado</span>
            <span style={{ textAlign: 'right' }}>Projetado</span>
          </div>
          {data?.cashResults.map((account) => (
            <div key={account.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedAccounts.has(account.id)}
                  onChange={() => toggleAccount(account.id)}
                  style={{ width: '16px', height: '16px', accentColor: '#22c55e' }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>{account.name}</span>
              </label>
              <span style={{ fontSize: '14px', color: '#374151', textAlign: 'right' }}>
                {formatCurrency(account.confirmedBalance)}
              </span>
              <span style={{ fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
                {formatCurrency(account.projectedBalance)}
              </span>
            </div>
          )) || <EmptyMessage>Nenhuma conta cadastrada</EmptyMessage>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e5e7eb' }}>
            <span style={{ fontWeight: 'bold', color: '#111827' }}>Total</span>
            <span style={{ fontWeight: 'bold', color: '#111827', textAlign: 'right' }}>
              {formatCurrency(totalConfirmed)}
            </span>
            <span style={{ fontWeight: 'bold', color: '#111827', textAlign: 'right' }}>
              {formatCurrency(totalProjected)}
            </span>
          </div>
        </Card>

        {/* Resultados de Caixa */}
        <Card title="Resultados de caixa" href="/reports/cashflow">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            <span>Conta</span>
            <span style={{ textAlign: 'right' }}>Entradas</span>
            <span style={{ textAlign: 'right' }}>Saídas</span>
            <span style={{ textAlign: 'right' }}>Resultado</span>
          </div>
          {data?.cashResults.map((cr) => (
            <div key={cr.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
              <Link href={`/accounts/${cr.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{cr.name}</Link>
              <span style={{ color: '#22c55e', textAlign: 'right' }}>{formatCurrency(cr.entradas)}</span>
              <span style={{ color: '#ef4444', textAlign: 'right' }}>{formatCurrency(cr.saidas)}</span>
              <span style={{ color: cr.resultado >= 0 ? '#22c55e' : '#ef4444', textAlign: 'right', fontWeight: 500 }}>
                {formatCurrency(cr.resultado)}
              </span>
            </div>
          )) || <EmptyMessage>Nenhum resultado</EmptyMessage>}
        </Card>
      </div>

      {/* Second Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Fluxo de Caixa */}
        <Card title="Fluxo de Caixa" subtitle="Mensal" href="/cashflow">
          <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '16px' }}>
            {data?.monthlyData.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', gap: '2px', height: '120px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, backgroundColor: '#22c55e', height: `${Math.min(100, (m.income / Math.max(...data.monthlyData.map(d => d.income || 1))) * 100)}%`, borderRadius: '2px 2px 0 0' }} />
                  <div style={{ flex: 1, backgroundColor: '#ef4444', height: `${Math.min(100, (m.expense / Math.max(...data.monthlyData.map(d => d.expense || 1))) * 100)}%`, borderRadius: '2px 2px 0 0' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{m.month}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
                Entradas
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                Saídas
              </span>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
              <strong>Saldo em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}:</strong>{' '}
              {formatCurrency(data?.summary.totalBankBalance || 0)}
            </div>
          </div>
        </Card>

        {/* Cartões de Crédito */}
        <Card title="Cartões de crédito" href="/credit-cards">
          {data?.creditCards.map((cc) => (
            <div key={cc.id} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: cc.color || '#6366f1', borderRadius: '4px' }} />
                <span style={{ fontWeight: 500, color: '#111827' }}>{cc.name}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Fatura: dia {cc.closingDay} (Venc. {cc.dueDay})
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Disponível: {formatCurrency(cc.availableLimit)}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                {formatCurrency(cc.currentBalance)}
              </div>
            </div>
          )) || <EmptyMessage>Nenhum cartão cadastrado</EmptyMessage>}
        </Card>

        {/* Despesas por Categoria */}
        <Card title="Despesas por categoria" subtitle="Situação projetada" href="/reports/expenses">
          <DonutChart data={data?.expenseByCategory || []} colors={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']} />
        </Card>
      </div>

      {/* Third Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Despesas por Centro */}
        <Card title="Despesas por centro" subtitle="Situação projetada" href="/reports/cost-centers">
          <DonutChart data={data?.expenseByCostCenter || []} colors={['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']} />
        </Card>

        {/* Receitas por Categoria */}
        <Card title="Receitas por categoria" href="/reports/income">
          <DonutChart data={data?.incomeByCategory || []} colors={['#22c55e', '#ef4444', '#f59e0b']} showTotal />
        </Card>

        {/* Receitas por Centro */}
        <Card title="Receitas por centro" href="/reports/income-centers">
          <DonutChart data={data?.incomeByCostCenter || []} colors={['#22c55e', '#3b82f6', '#f59e0b']} showTotal />
        </Card>
      </div>

      {/* Fourth Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Balanço Patrimonial */}
        <Card title="Balanço Patrimonial" href="/reports/balance-sheet">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Ativo */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e', marginBottom: '12px' }}>ATIVO</h4>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                  <span>Disponível</span>
                  <span>{formatCurrency(data?.balanceSheet.ativo.disponivel || 0)}</span>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                  <span>Realizável</span>
                  <span>{formatCurrency(data?.balanceSheet.ativo.realizavel || 0)}</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#22c55e' }}>
                <span>Total</span>
                <span>{formatCurrency(data?.balanceSheet.ativo.total || 0)}</span>
              </div>
            </div>
            {/* Passivo */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444', marginBottom: '12px' }}>PASSIVO</h4>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                  <span>Devedor</span>
                  <span>{formatCurrency(data?.balanceSheet.passivo.devedor || 0)}</span>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                  <span>Exigível</span>
                  <span>{formatCurrency(data?.balanceSheet.passivo.exigivel || 0)}</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#ef4444' }}>
                <span>Total</span>
                <span>{formatCurrency(data?.balanceSheet.passivo.total || 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Metas de Receita por Centro */}
        <Card title="Metas de receita por centro" href="/budget">
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Centro</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Meta</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Realizado</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Resíduo</th>
              </tr>
            </thead>
            <tbody>
              {data?.incomeByCostCenter.map((center, i) => {
                const meta = center.value * 1.2; // Example: 20% above current
                const residuo = meta - center.value;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 0', color: '#374151' }}>{center.name}</td>
                    <td style={{ padding: '8px 0', color: '#374151', textAlign: 'right' }}>{formatCurrency(meta)}</td>
                    <td style={{ padding: '8px 0', color: '#22c55e', textAlign: 'right' }}>{formatCurrency(center.value)}</td>
                    <td style={{ padding: '8px 0', color: residuo >= 0 ? '#f59e0b' : '#22c55e', textAlign: 'right' }}>{formatCurrency(residuo)}</td>
                  </tr>
                );
              }) || (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>
                    Nenhum dado disponível
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Fifth Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Metas de Despesas por Centro */}
        <Card title="Metas de despesas por centro" href="/budget">
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Centro</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Meta</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Realizado</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Resíduo</th>
              </tr>
            </thead>
            <tbody>
              {data?.expenseByCostCenter.map((center, i) => {
                const meta = center.value * 1.1; // Example budget
                const residuo = meta - center.value;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 0', color: '#374151' }}>{center.name}</td>
                    <td style={{ padding: '8px 0', color: '#374151', textAlign: 'right' }}>{formatCurrency(meta)}</td>
                    <td style={{ padding: '8px 0', color: '#ef4444', textAlign: 'right' }}>{formatCurrency(center.value)}</td>
                    <td style={{ padding: '8px 0', color: residuo >= 0 ? '#22c55e' : '#ef4444', textAlign: 'right' }}>{formatCurrency(residuo)}</td>
                  </tr>
                );
              }) || (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>
                    Nenhum dado disponível
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Últimas Transações */}
        <Card title="Últimas transações" href="/transactions">
          <EmptyMessage>
            <Link href="/transactions/new" style={{ display: 'inline-block', marginTop: '8px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '14px' }}>
              Fazer lançamento
            </Link>
          </EmptyMessage>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Components

function Card({ title, subtitle, children, href }: { title: string; subtitle?: string; children: React.ReactNode; href?: string }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>
            Ver mais →
          </Link>
        )}
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, href }: { title: string; value: string; subtitle: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>{title}</p>
        <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: '0 0 4px 0' }}>{value}</p>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{subtitle}</p>
      </div>
    </Link>
  );
}

function GoalProgress({ name, current, target, color }: { name: string; current: number; target: number; color: string }) {
  const progress = Math.min(100, (current / target) * 100);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', color: '#374151' }}>{name}</span>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>{formatCurrency(current)} / {formatCurrency(target)}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: color, borderRadius: '4px' }} />
      </div>
    </div>
  );
}

function DonutChart({ data, colors, showTotal }: { data: Array<{ name: string; value: number }>; colors: string[]; showTotal?: boolean }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0 || total === 0) {
    return <EmptyMessage>Nenhum dado disponível</EmptyMessage>;
  }

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      {/* Simple donut representation */}
      <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `conic-gradient(${data.map((d, i) => {
        const startPercent = data.slice(0, i).reduce((sum, item) => sum + (item.value / total) * 100, 0);
        const endPercent = startPercent + (d.value / total) * 100;
        return `${colors[i % colors.length]} ${startPercent}% ${endPercent}%`;
      }).join(', ')})`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60px', height: '60px', backgroundColor: 'white', borderRadius: '50%' }} />
      </div>
      {/* Legend */}
      <div style={{ flex: 1 }}>
        {data.slice(0, 6).map((d, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[i % colors.length] }} />
              {d.name}
            </span>
            <span style={{ color: showTotal ? '#22c55e' : '#6b7280', fontWeight: showTotal ? 500 : 400 }}>
              {showTotal ? formatCurrency(d.value) : `${((d.value / total) * 100).toFixed(1)}%`}
            </span>
          </div>
        ))}
        {showTotal && (
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: '#22c55e' }}>{formatCurrency(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280', fontSize: '14px' }}>
      {children || 'Nenhum dado disponível'}
    </div>
  );
}
