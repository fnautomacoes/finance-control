'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface PaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export default function FormasPagamentoPage() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch('/api/payment-methods');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setPaymentMethods(data);
      } else {
        console.error('API returned non-array data:', data);
        setPaymentMethods([]);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMethod ? `/api/payment-methods/${editingMethod.id}` : '/api/payment-methods';
      const method = editingMethod ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingMethod(null);
        setFormData({ name: '' });
        fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return;

    try {
      await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({ name: method.name });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingMethod(null);
    setFormData({ name: '' });
    setShowModal(true);
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    toolbar: {
      display: 'flex', alignItems: 'center', gap: '16px',
      justifyContent: 'flex-end', marginBottom: '16px',
    },
    exportButton: {
      padding: '10px 16px', border: '1px solid #1f2937', borderRadius: '8px',
      backgroundColor: 'white', color: '#1f2937', cursor: 'pointer', fontWeight: '500',
    },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' },
    listItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
    },
    itemName: { fontWeight: '500', color: '#1f2937' },
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#9ca3af', display: 'flex', gap: '8px' },
    actionIcon: { cursor: 'pointer', padding: '4px' },
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
    modalContent: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { fontSize: '18px', fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '4px', fontSize: '14px', color: '#374151', fontWeight: '500' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
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
          <h1 style={styles.title}>Formas de Pagamento</h1>
        </div>

        <div style={styles.toolbar}>
          <button style={styles.exportButton}>
            Exportar formas de pagamento
          </button>
        </div>

        <div style={styles.card}>
          {paymentMethods.map(method => (
            <div key={method.id} style={styles.listItem}>
              <span style={styles.itemName}>{method.name}</span>
              <div style={styles.menuButton}>
                <span
                  style={styles.actionIcon}
                  onClick={() => openEditModal(method)}
                  title="Editar"
                >
                  ✏️
                </span>
                <span
                  style={styles.actionIcon}
                  onClick={() => handleDelete(method.id)}
                  title="Excluir"
                >
                  🗑️
                </span>
              </div>
            </div>
          ))}

          {paymentMethods.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              Nenhuma forma de pagamento encontrada
            </div>
          )}
        </div>

        {/* FAB */}
        <button style={styles.fab} onClick={openCreateModal}>+</button>

        {/* Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowModal(false)}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
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

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingMethod && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingMethod.id)}
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
