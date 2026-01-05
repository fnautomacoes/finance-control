'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  initialBalance: number;
  color: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: string;
  categoryId: string;
  category: Category | null;
  accountId: string;
  account: Account | null;
  notes: string | null;
  runningBalance: number;
}

interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  initialBalance: number;
  finalBalance: number;
}

interface TransactionFormData {
  description: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  categoryId: string;
  accountId: string;
  notes: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function LancamentosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    description: '',
    amount: '',
    type: 'EXPENSE',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    accountId: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
        // Select first account by default if none selected
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  }, [selectedAccountId]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      if (filterType !== 'ALL') params.append('type', filterType);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setSummary(data.summary);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar transações');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, filterType]);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, [fetchAccounts, fetchCategories]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions();
    }
  }, [selectedAccountId, filterType, fetchTransactions]);

  const openNewTransactionModal = () => {
    setEditingTransaction(null);
    setFormData({
      description: '',
      amount: '',
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      accountId: selectedAccountId,
      notes: '',
    });
    setShowModal(true);
  };

  const openEditTransactionModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type as 'INCOME' | 'EXPENSE',
      date: transaction.date.split('T')[0],
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      notes: transaction.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount.replace(',', '.')),
      };

      let response;
      if (editingTransaction) {
        response = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        setShowModal(false);
        fetchTransactions();
        fetchAccounts(); // Refresh account balances
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao salvar transação');
      }
    } catch (err) {
      alert('Erro de conexão');
      console.error('Error saving transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTransactions();
        fetchAccounts();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao excluir transação');
      }
    } catch (err) {
      alert('Erro de conexão');
      console.error('Error deleting transaction:', err);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const filteredCategories = categories.filter(c =>
    formData.type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
  );

  return (
    <DashboardLayout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0 }}>Transações</h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>Gerencie suas receitas e despesas</p>
          </div>
          <button
            onClick={openNewTransactionModal}
            style={{
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            + Nova Transação
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#10b981' }}>↗</span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Total de Receitas</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
              {formatCurrency(summary?.totalIncome || 0)}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#ef4444' }}>↘</span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Total de Despesas</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
              {formatCurrency(summary?.totalExpense || 0)}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Saldo</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: (summary?.balance || 0) >= 0 ? '#1f2937' : '#ef4444' }}>
              {formatCurrency(summary?.balance || 0)}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
          {/* Left Sidebar */}
          <div>
            {/* Account Selector */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Conta
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  backgroundColor: 'white',
                }}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Financial Summary */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px', marginTop: 0 }}>
                Resumo Financeiro
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Saldo anterior</span>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: (summary?.initialBalance || 0) >= 0 ? '#1f2937' : '#ef4444' }}>
                    {formatCurrency(summary?.initialBalance || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Receitas</span>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#10b981' }}>
                    {formatCurrency(summary?.totalIncome || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Despesas</span>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#ef4444' }}>
                    {formatCurrency(summary?.totalExpense || 0)}
                  </span>
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>Saldo final</span>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: (summary?.finalBalance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(summary?.finalBalance || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {/* Filter Tabs */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilterType('ALL')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: filterType === 'ALL' ? '#3b82f6' : '#f3f4f6',
                  color: filterType === 'ALL' ? 'white' : '#374151',
                }}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterType('INCOME')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: filterType === 'INCOME' ? '#10b981' : '#f3f4f6',
                  color: filterType === 'INCOME' ? 'white' : '#374151',
                }}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilterType('EXPENSE')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: filterType === 'EXPENSE' ? '#ef4444' : '#f3f4f6',
                  color: filterType === 'EXPENSE' ? 'white' : '#374151',
                }}
              >
                Despesas
              </button>
            </div>

            {/* Transactions */}
            <div style={{ padding: '0' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  Carregando...
                </div>
              ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                  {error}
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  Nenhuma transação encontrada
                </div>
              ) : (
                <>
                  {/* Initial Balance Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    alignItems: 'center',
                    backgroundColor: '#fafafa'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Saldo anterior</span>
                    <span></span>
                    <span style={{
                      fontWeight: '600',
                      color: (summary?.initialBalance || 0) >= 0 ? '#1f2937' : '#ef4444',
                      textAlign: 'right',
                      minWidth: '120px'
                    }}>
                      {formatCurrency(summary?.initialBalance || 0)}
                    </span>
                  </div>

                  {/* Transaction Rows */}
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto',
                        padding: '16px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: transaction.type === 'INCOME' ? '#10b981' : '#ef4444',
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>
                            {formatDate(transaction.date)}
                          </div>
                          <div style={{ fontWeight: '500', color: '#1f2937' }}>
                            {transaction.description}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {transaction.category?.name || 'Categoria'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: '600',
                            color: transaction.type === 'INCOME' ? '#10b981' : '#ef4444',
                          }}
                        >
                          {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <span
                          style={{
                            fontWeight: '500',
                            color: transaction.runningBalance >= 0 ? '#1f2937' : '#ef4444',
                          }}
                        >
                          {formatCurrency(transaction.runningBalance)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditTransactionModal(transaction)}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            borderRadius: '4px',
                          }}
                          title="Editar"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            borderRadius: '4px',
                          }}
                          title="Excluir"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', marginTop: 0 }}>
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </h2>

              <form onSubmit={handleSubmit}>
                {/* Type Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Tipo
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'EXPENSE', categoryId: '' })}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: formData.type === 'EXPENSE' ? '#ef4444' : '#e5e7eb',
                        backgroundColor: formData.type === 'EXPENSE' ? '#fef2f2' : 'white',
                        color: formData.type === 'EXPENSE' ? '#ef4444' : '#374151',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'INCOME', categoryId: '' })}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: formData.type === 'INCOME' ? '#10b981' : '#e5e7eb',
                        backgroundColor: formData.type === 'INCOME' ? '#f0fdf4' : 'white',
                        color: formData.type === 'INCOME' ? '#10b981' : '#374151',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Receita
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Descrição *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Ex: Compra no supermercado"
                  />
                </div>

                {/* Amount */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Valor *
                  </label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="0,00"
                  />
                </div>

                {/* Date */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Account */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Conta *
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Selecione uma conta</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Categoria *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Selecione uma categoria</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Observações adicionais..."
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
