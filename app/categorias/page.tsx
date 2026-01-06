'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  color: string;
  icon: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

export default function CategoriasPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    color: '#6366f1',
    parentId: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      // Defensive check: ensure data is an array
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.error('API returned non-array data:', data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (cats: Category[], type: 'INCOME' | 'EXPENSE'): Category[] => {
    const filtered = cats.filter(c => c.type === type && (showActiveOnly ? c.isActive : true));
    const rootCategories = filtered.filter(c => !c.parentId);

    return rootCategories.map(parent => ({
      ...parent,
      children: filtered.filter(c => c.parentId === parent.id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ name: '', type: 'EXPENSE', color: '#6366f1', parentId: '' });
        fetchCategories();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type as 'INCOME' | 'EXPENSE',
      color: category.color,
      parentId: category.parentId || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', type: activeTab, color: '#6366f1', parentId: '' });
    setShowModal(true);
  };

  const expenseCategories = buildHierarchy(categories, 'EXPENSE');
  const incomeCategories = buildHierarchy(categories, 'INCOME');
  const expenseCount = categories.filter(c => c.type === 'EXPENSE' && (showActiveOnly ? c.isActive : true)).length;
  const incomeCount = categories.filter(c => c.type === 'INCOME' && (showActiveOnly ? c.isActive : true)).length;

  const parentOptions = categories.filter(c =>
    c.type === formData.type &&
    !c.parentId &&
    c.id !== editingCategory?.id
  );

  const styles = {
    container: { padding: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    content: { display: 'flex', gap: '24px' },
    sidebar: { width: '280px', flexShrink: 0 },
    sidebarCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tabButton: (active: boolean, isExpense: boolean) => ({
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', width: '100%', border: 'none', borderRadius: '8px',
      cursor: 'pointer', marginBottom: '8px',
      backgroundColor: active ? (isExpense ? '#fef2f2' : '#f0fdf4') : 'transparent',
      color: isExpense ? '#dc2626' : '#16a34a', fontWeight: '500',
    }),
    badge: (isExpense: boolean) => ({
      backgroundColor: isExpense ? '#fee2e2' : '#dcfce7',
      color: isExpense ? '#dc2626' : '#16a34a',
      padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
    }),
    toggleContainer: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' },
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
      marginTop: '16px', width: '100%', padding: '10px',
      border: '1px solid #10b981', borderRadius: '8px',
      backgroundColor: 'white', color: '#10b981',
      cursor: 'pointer', fontWeight: '500',
    },
    main: { flex: 1 },
    mainCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    categoryItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' },
    categoryName: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', color: '#1f2937' },
    subCategoryName: { display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', paddingLeft: '24px' },
    childCount: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '8px' },
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
    select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' },
    submitButton: { width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    dropdown: {
      position: 'absolute' as const, right: 0, top: '100%',
      backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '120px', zIndex: 10,
    },
    dropdownItem: { padding: '10px 16px', cursor: 'pointer', fontSize: '14px' },
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
          <h1 style={styles.title}>Categorias</h1>
        </div>

        <div style={styles.content}>
          {/* Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarCard}>
              <button
                style={styles.tabButton(activeTab === 'EXPENSE', true)}
                onClick={() => setActiveTab('EXPENSE')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>↓</span> Despesas
                </span>
                <span style={styles.badge(true)}>{expenseCount}</span>
              </button>

              <button
                style={styles.tabButton(activeTab === 'INCOME', false)}
                onClick={() => setActiveTab('INCOME')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>↑</span> Receitas
                </span>
                <span style={styles.badge(false)}>{incomeCount}</span>
              </button>

              <div style={styles.toggleContainer}>
                <button
                  style={styles.toggle(showActiveOnly)}
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                >
                  <div style={styles.toggleKnob(showActiveOnly)} />
                </button>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Exibir apenas categorias ativas</span>
              </div>

              <button style={styles.exportButton}>
                Exportar categorias ativas
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div style={styles.main}>
            <div style={styles.mainCard}>
              {(activeTab === 'EXPENSE' ? expenseCategories : incomeCategories).map(category => (
                <div key={category.id}>
                  <div style={styles.categoryItem}>
                    <div style={styles.categoryName}>
                      <span>{category.name}</span>
                      {category.children && category.children.length > 0 && (
                        <span style={styles.childCount}>{category.children.length}</span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button
                        style={styles.menuButton}
                        onClick={() => openEditModal(category)}
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                  {category.children?.map(child => (
                    <div key={child.id} style={styles.categoryItem}>
                      <div style={styles.subCategoryName}>
                        <span>↳</span>
                        <span>{child.name}</span>
                      </div>
                      <button
                        style={styles.menuButton}
                        onClick={() => openEditModal(child)}
                      >
                        ⋮
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {(activeTab === 'EXPENSE' ? expenseCategories : incomeCategories).length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                  Nenhuma categoria encontrada
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAB */}
        <button style={styles.fab} onClick={openCreateModal}>+</button>

        {/* Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowModal(false)}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo</label>
                  <select
                    style={styles.select}
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE', parentId: '' })}
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Receita</option>
                  </select>
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
                  <label style={styles.label}>Categoria Pai (opcional)</label>
                  <select
                    style={styles.select}
                    value={formData.parentId}
                    onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                  >
                    <option value="">Nenhuma (categoria raiz)</option>
                    {parentOptions.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
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
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingCategory.id)}
                      style={{ ...styles.submitButton, backgroundColor: '#ef4444', flex: 1 }}
                    >
                      Excluir
                    </button>
                  )}
                  <button type="submit" style={{ ...styles.submitButton, flex: 1 }}>
                    {editingCategory ? 'Salvar' : 'Criar'}
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
