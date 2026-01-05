'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface Account {
  id: string;
  name: string;
  color: string;
  type: string;
}

interface AccountWithBalance extends Account {
  initialBalance: number;
  finalBalance: number;
}

interface DailyData {
  date: string;
  dateFormatted: string;
  income: number;
  expense: number;
  result: number;
  balance: number;
}

interface CashflowData {
  accounts: Account[];
  selectedAccounts: AccountWithBalance[];
  summary: {
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    result: number;
    finalBalance: number;
  };
  dailyData: DailyData[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatShortCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(2)} mi`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(2)} mil`;
  }
  return formatCurrency(value);
};

const formatDateRange = (start: Date, end: Date): string => {
  const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${startStr} - ${endStr}`;
};

export default function CashflowPage() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [includePending, setIncludePending] = useState(false);
  const [excludeTransfers, setExcludeTransfers] = useState(false);

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString().split('T')[0] ?? '');
      params.append('endDate', endDate.toISOString().split('T')[0] ?? '');
      if (selectedAccountIds.length > 0) {
        params.append('accountIds', selectedAccountIds.join(','));
      }
      params.append('includePending', includePending.toString());
      params.append('excludeTransfers', excludeTransfers.toString());

      const response = await fetch(`/api/cashflow?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);

        // Select all accounts by default if none selected
        if (selectedAccountIds.length === 0 && result.accounts.length > 0) {
          setSelectedAccountIds(result.accounts.map((a: Account) => a.id));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar fluxo de caixa');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error fetching cashflow:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedAccountIds, includePending, excludeTransfers]);

  useEffect(() => {
    fetchCashflow();
  }, [fetchCashflow]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const navigateDates = (direction: 'prev' | 'next') => {
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (direction === 'prev') {
      const newEnd = new Date(startDate);
      newEnd.setDate(newEnd.getDate() - 1);
      const newStart = new Date(newEnd);
      newStart.setDate(newStart.getDate() - days);
      setStartDate(newStart);
      setEndDate(newEnd);
    } else {
      const newStart = new Date(endDate);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + days);
      setStartDate(newStart);
      setEndDate(newEnd);
    }
  };

  const totalBalance = data?.selectedAccounts.reduce((sum, a) => sum + a.finalBalance, 0) ?? 0;

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {/* Date Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigateDates('prev')}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#6b7280',
              }}
            >
              ‹
            </button>
            <span style={{ fontWeight: '500', color: '#1f2937' }}>
              {formatDateRange(startDate, endDate)}
            </span>
            <button
              onClick={() => navigateDates('next')}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#6b7280',
              }}
            >
              ›
            </button>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              style={{
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <span style={{ color: '#6b7280' }}>até</span>
            <input
              type="date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              style={{
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
              <input
                type="checkbox"
                checked={includePending}
                onChange={(e) => setIncludePending(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Considerar lançamentos pendentes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
              <input
                type="checkbox"
                checked={excludeTransfers}
                onChange={(e) => setExcludeTransfers(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Desconsiderar transferências intracaixa
            </label>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            Carregando...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
            {error}
          </div>
        ) : data && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
            {/* Left Sidebar - Account List */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              height: 'fit-content',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e5e7eb',
              }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}></span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  Saldo em {endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              </div>

              {data.accounts.map((account) => {
                const accountData = data.selectedAccounts.find((a) => a.id === account.id);
                const isSelected = selectedAccountIds.includes(account.id);

                return (
                  <label
                    key={account.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAccount(account.id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: account.color || '#6366f1',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>{account.name}</span>
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: (accountData?.finalBalance ?? 0) >= 0 ? '#10b981' : '#ef4444',
                    }}>
                      {accountData ? formatCurrency(accountData.finalBalance) : '-'}
                    </span>
                  </label>
                );
              })}

              {/* Total */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                marginTop: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#6b7280',
                  }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Total</span>
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: totalBalance >= 0 ? '#10b981' : '#ef4444',
                }}>
                  {formatCurrency(totalBalance)}
                </span>
              </div>
            </div>

            {/* Main Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Cash Flow Chart */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginTop: 0, marginBottom: '20px' }}>
                  Fluxo de caixa
                </h3>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="dateFormatted"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => formatShortCurrency(value)}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#1f2937"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#1f2937' }}
                        name="Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Table */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}></th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Entradas (R$)</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Saídas (R$)</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Resultado (R$)</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Saldo (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', color: '#374151', fontSize: '14px' }}>Saldo anterior</td>
                      <td style={{ textAlign: 'right', padding: '12px 16px' }}></td>
                      <td style={{ textAlign: 'right', padding: '12px 16px' }}></td>
                      <td style={{ textAlign: 'right', padding: '12px 16px' }}></td>
                      <td style={{
                        textAlign: 'right',
                        padding: '12px 16px',
                        color: data.summary.initialBalance >= 0 ? '#10b981' : '#ef4444',
                        fontWeight: '500',
                        fontSize: '14px',
                      }}>
                        {formatCurrency(data.summary.initialBalance)}
                      </td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', color: '#374151', fontSize: '14px', fontWeight: '500' }}>Total</td>
                      <td style={{ textAlign: 'right', padding: '12px 16px', color: '#374151', fontSize: '14px' }}>
                        {formatCurrency(data.summary.totalIncome)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 16px', color: '#374151', fontSize: '14px' }}>
                        {formatCurrency(data.summary.totalExpense)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 16px', color: '#374151', fontSize: '14px' }}>
                        {formatCurrency(data.summary.result)}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        padding: '12px 16px',
                        color: data.summary.finalBalance >= 0 ? '#10b981' : '#ef4444',
                        fontWeight: '500',
                        fontSize: '14px',
                      }}>
                        {formatCurrency(data.summary.finalBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cash Result Chart */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginTop: 0, marginBottom: '20px' }}>
                  Resultado de caixa
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="dateFormatted"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => formatShortCurrency(value)}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Entradas" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#f87171" name="Saídas" radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="result"
                        stroke="#6b7280"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Resultado"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => window.location.href = '/lancamentos'}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Novo lançamento"
        >
          +
        </button>
      </div>
    </DashboardLayout>
  );
}
