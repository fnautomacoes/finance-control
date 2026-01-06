'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: number;
  initialDate: string;
  currentBalance: number;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  color: string;
  icon: string;
  isActive: boolean;
}

const accountTypeLabels: Record<string, string> = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Poupança',
  INVESTMENT: 'Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  CASH: 'Dinheiro',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

const accountTypeIcons: Record<string, string> = {
  CHECKING: '🏦',
  SAVINGS: '💰',
  INVESTMENT: '📈',
  CREDIT_CARD: '💳',
  CASH: '💵',
  DIGITAL_WALLET: '📱',
  OTHER: '📁',
};

const currencyLabels: Record<string, string> = {
  BRL: 'Real (R$)',
  USD: 'Dólar ($)',
  EUR: 'Euro (€)',
};

export default function ContasPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'accounts' | 'connections'>('accounts');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHECKING',
    currency: 'BRL',
    initialBalance: '0',
    initialDate: new Date().toISOString().split('T')[0],
    balanceType: 'credit' as 'credit' | 'debit',
    creditLimit: '',
    dueDay: '',
    color: '#6366f1',
  });

  useEffect(() => {
    fetchAccounts();
  }, [showActiveOnly]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/accounts?includeInactive=${!showActiveOnly}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      // Defensive check: ensure data is an array
      if (Array.isArray(data)) {
        setAccounts(data);
      } else {
        console.error('API returned non-array data:', data);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const groupedAccounts = accounts
    .filter(a => showActiveOnly ? a.isActive : true)
    .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, account) => {
      const type = account.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    }, {} as Record<string, Account[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const balance = parseFloat(formData.initialBalance) || 0;
      const finalBalance = formData.balanceType === 'debit' ? -balance : balance;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          initialBalance: finalBalance,
          initialDate: formData.initialDate,
          creditLimit: formData.type === 'CREDIT_CARD' && formData.creditLimit ? parseFloat(formData.creditLimit) : null,
          dueDay: formData.type === 'CREDIT_CARD' && formData.dueDay ? parseInt(formData.dueDay) : null,
          color: formData.color,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingAccount(null);
        resetForm();
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'CHECKING',
      currency: 'BRL',
      initialBalance: '0',
      initialDate: new Date().toISOString().split('T')[0],
      balanceType: 'credit',
      creditLimit: '',
      dueDay: '',
      color: '#6366f1',
    });
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: Math.abs(account.initialBalance).toString(),
      initialDate: account.initialDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      balanceType: account.initialBalance >= 0 ? 'credit' : 'debit',
      creditLimit: account.creditLimit?.toString() || '',
      dueDay: account.dueDay?.toString() || '',
      color: account.color,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    resetForm();
    setShowModal(true);
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const styles = {
    container: { padding: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    tabs: { display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' },
    tab: (active: boolean) => ({
      padding: '12px 0', fontWeight: '500', color: active ? '#2563eb' : '#6b7280',
      borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
      cursor: 'pointer', background: 'none', border: 'none',
    }),
    toolbar: {
      display: 'flex', alignItems: 'center', gap: '16px',
      marginBottom: '24px',
    },
    searchInput: {
      padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
      fontSize: '14px', width: '200px',
    },
    toggleContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
    toggle: (active: boolean) => ({
      width: '44px', height: '24px', borderRadius: '12px',
      backgroundColor: active ? '#10b981' : '#d1d5db',
      position: 'relative' as const, cursor: 'pointer', border: 'none',
    }),
    toggleKnob: (active: boolean) => ({
      width: '20px', height: '20px', borderRadius: '50%',
      backgroundColor: 'white', position: 'absolute' as const,
      top: '2px', left: active ? '22px' : '2px',
      transition: 'left 0.2s',
    }),
    exportButton: {
      padding: '10px 16px', border: '1px solid #1f2937', borderRadius: '8px',
      backgroundColor: 'white', color: '#1f2937', cursor: 'pointer', fontWeight: '500',
    },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' },
    accountCount: { fontSize: '12px', color: '#6b7280', fontWeight: 'normal', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' },
    accountItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
    },
    accountInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
    accountIcon: (color: string) => ({
      width: '40px', height: '40px', borderRadius: '8px',
      backgroundColor: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'white', fontWeight: '600',
    }),
    accountName: { fontWeight: '500', color: '#1f2937' },
    accountDetails: { display: 'flex', alignItems: 'center', gap: '24px' },
    detailLabel: { fontSize: '12px', color: '#9ca3af' },
    detailValue: { fontWeight: '500', color: '#1f2937' },
    badge: (color: string) => ({
      padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
      backgroundColor: color, color: 'white',
    }),
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#9ca3af' },
    fab: {
      position: 'fixed' as const, bottom: '24px', right: '24px',
      width: '56px', height: '56px', borderRadius: '50%',
      backgroundColor: '#10b981', color: 'white', border: 'none',
      cursor: 'pointer', fontSize: '24px',
      boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
    },
    modal: {
      position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    },
    modalContent: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90%', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { fontSize: '18px', fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' },
    formRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
    formGroup: { marginBottom: '16px', flex: 1 },
    label: { display: 'block', marginBottom: '4px', fontSize: '14px', color: '#374151', fontWeight: '500' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' },
    radioGroup: { display: 'flex', gap: '16px', marginTop: '8px' },
    radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    submitButton: { width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <p>Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Contas</h1>
        </div>

        <div style={styles.tabs}>
          <button
            style={styles.tab(activeTab === 'accounts')}
            onClick={() => setActiveTab('accounts')}
          >
            Contas
          </button>
          <button
            style={styles.tab(activeTab === 'connections')}
            onClick={() => setActiveTab('connections')}
          >
            Conexões
          </button>
        </div>

        {activeTab === 'accounts' && (
          <>
            <div style={styles.toolbar}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Filtrar contas"
                  style={{ ...styles.searchInput, paddingLeft: '36px' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }} />
              <div style={styles.toggleContainer}>
                <button
                  style={styles.toggle(showActiveOnly)}
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                >
                  <div style={styles.toggleKnob(showActiveOnly)} />
                </button>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Exibir apenas contas ativas</span>
              </div>
              <button style={styles.exportButton}>
                Exportar contas ativas
              </button>
            </div>

            {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
              <div key={type} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span>{accountTypeLabels[type] || type}</span>
                  <span style={styles.accountCount}>{typeAccounts.length} {typeAccounts.length === 1 ? 'conta' : 'contas'}</span>
                </div>
                {typeAccounts.map(account => (
                  <div key={account.id} style={styles.accountItem}>
                    <div style={styles.accountInfo}>
                      <div style={styles.accountIcon(account.color)}>
                        {account.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.accountName}>{account.name}</div>
                        {type === 'CREDIT_CARD' && account.dueDay && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Vencimento: dia {account.dueDay}</div>
                        )}
                      </div>
                    </div>
                    <div style={styles.accountDetails}>
                      {type === 'CHECKING' && (
                        <div>
                          <div style={styles.detailLabel}>Considerar saldo</div>
                          <span style={styles.badge('#10b981')}>Disponível</span>
                        </div>
                      )}
                      {type === 'CREDIT_CARD' && (
                        <>
                          <div>
                            <div style={styles.detailLabel}>Vencimento</div>
                            <span style={styles.badge('#6b7280')}>{account.dueDay || '-'}</span>
                          </div>
                          <div>
                            <div style={styles.detailLabel}>Limite</div>
                            <div style={styles.detailValue}>{formatCurrency(account.creditLimit || 0, account.currency)}</div>
                          </div>
                        </>
                      )}
                      <button
                        style={styles.menuButton}
                        onClick={() => openEditModal(account)}
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {Object.keys(groupedAccounts).length === 0 && (
              <div style={{ ...styles.card, padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                Nenhuma conta encontrada
              </div>
            )}
          </>
        )}

        {activeTab === 'connections' && (
          <div style={{ ...styles.card, padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            Funcionalidade de conexões bancárias em desenvolvimento
          </div>
        )}

        {/* FAB */}
        <button style={styles.fab} onClick={openCreateModal}>+</button>

        {/* Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingAccount ? 'Editar conta' : 'Nova conta'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowModal(false)}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tipo</label>
                    <select
                      style={styles.select}
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                      {Object.entries(accountTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Moeda</label>
                    <select
                      style={styles.select}
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {Object.entries(currencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Data do saldo inicial *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formData.initialDate}
                    onChange={e => setFormData({ ...formData, initialDate: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Saldo em {formData.initialDate ? new Date(formData.initialDate).toLocaleDateString('pt-BR') : '-'} ({formData.currency})
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...styles.input, flex: 1 }}
                      value={formData.initialBalance}
                      onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                    />
                    <div style={styles.radioGroup}>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="balanceType"
                          checked={formData.balanceType === 'credit'}
                          onChange={() => setFormData({ ...formData, balanceType: 'credit' })}
                        />
                        Credor
                      </label>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="balanceType"
                          checked={formData.balanceType === 'debit'}
                          onChange={() => setFormData({ ...formData, balanceType: 'debit' })}
                        />
                        Devedor
                      </label>
                    </div>
                  </div>
                </div>

                {formData.type === 'CREDIT_CARD' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Limite do cartão</label>
                      <input
                        type="number"
                        step="0.01"
                        style={styles.input}
                        value={formData.creditLimit}
                        onChange={e => setFormData({ ...formData, creditLimit: e.target.value })}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Dia de vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        style={styles.input}
                        value={formData.dueDay}
                        onChange={e => setFormData({ ...formData, dueDay: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingAccount && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingAccount.id)}
                      style={{ ...styles.submitButton, backgroundColor: '#ef4444', flex: 1 }}
                    >
                      Excluir
                    </button>
                  )}
                  <button type="submit" style={{ ...styles.submitButton, flex: 1 }}>
                    Salvar
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
