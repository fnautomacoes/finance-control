'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface CostCenter {
  id: string;
  name: string;
  code: string | null;
  color: string;
  isActive: boolean;
  _count?: { transactions: number };
}

export default function CentrosPage() {
  const router = useRouter();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#6366f1',
  });

  useEffect(() => {
    fetchCostCenters();
  }, [showActiveOnly]);

  const fetchCostCenters = async () => {
    try {
      const res = await fetch(`/api/cost-centers?activeOnly=${showActiveOnly}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      // Defensive check: ensure data is an array
      if (Array.isArray(data)) {
        setCostCenters(data);
      } else {
        console.error('API returned non-array data:', data);
        setCostCenters([]);
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      setCostCenters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCenter ? `/api/cost-centers/${editingCenter.id}` : '/api/cost-centers';
      const method = editingCenter ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          code: formData.code || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingCenter(null);
        setFormData({ name: '', code: '', color: '#6366f1' });
        fetchCostCenters();
      }
    } catch (error) {
      console.error('Error saving cost center:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este centro de custo?')) return;

    try {
      await fetch(`/api/cost-centers/${id}`, { method: 'DELETE' });
      fetchCostCenters();
    } catch (error) {
      console.error('Error deleting cost center:', error);
    }
  };

  const openEditModal = (center: CostCenter) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      code: center.code || '',
      color: center.color,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingCenter(null);
    setFormData({ name: '', code: '', color: '#6366f1' });
    setShowModal(true);
  };

  const styles = {
    container: { padding: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    toolbar: {
      display: 'flex', alignItems: 'center', gap: '16px',
      backgroundColor: 'white', padding: '16px', borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px',
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
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    listItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
    },
    itemName: { fontWeight: '500', color: '#1f2937' },
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
          <h1 style={styles.title}>Centros de Custo</h1>
        </div>

        <div style={styles.toolbar}>
          <div style={styles.toggleContainer}>
            <button
              style={styles.toggle(showActiveOnly)}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              <div style={styles.toggleKnob(showActiveOnly)} />
            </button>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Exibir apenas centros ativos</span>
          </div>
          <div style={{ flex: 1 }} />
          <button style={styles.exportButton}>
            Exportar centros ativos
          </button>
        </div>

        <div style={styles.card}>
          {costCenters.map(center => (
            <div key={center.id} style={styles.listItem}>
              <span style={styles.itemName}>{center.name}</span>
              <button
                style={styles.menuButton}
                onClick={() => openEditModal(center)}
              >
                ⋮
              </button>
            </div>
          ))}

          {costCenters.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              Nenhum centro de custo encontrado
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
                  {editingCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
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

                <div style={styles.formGroup}>
                  <label style={styles.label}>Código (opcional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: CC001"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Cor</label>
                  <input
                    type="color"
                    style={{ ...styles.input, height: '40px', padding: '4px' }}
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingCenter && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingCenter.id)}
                      style={{ ...styles.submitButton, backgroundColor: '#ef4444', flex: 1 }}
                    >
                      Excluir
                    </button>
                  )}
                  <button type="submit" style={{ ...styles.submitButton, flex: 1 }}>
                    {editingCenter ? 'Salvar' : 'Criar'}
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
