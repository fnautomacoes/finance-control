'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';

interface Tag {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

const colorPalette = [
  // Row 1 - Light
  '#ffcdd2', '#ffe0b2', '#fff9c4', '#c8e6c9', '#b3e5fc', '#e1bee7', '#f8bbd9',
  // Row 2 - Medium light
  '#ef9a9a', '#ffcc80', '#fff59d', '#a5d6a7', '#81d4fa', '#ce93d8', '#f48fb1',
  // Row 3 - Medium
  '#e57373', '#ffb74d', '#fff176', '#81c784', '#4fc3f7', '#ba68c8', '#f06292',
  // Row 4 - Dark
  '#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#29b6f6', '#ab47bc', '#ec407a',
  // Row 5 - Darker
  '#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#03a9f4', '#9c27b0', '#e91e63',
  // Row 6 - Darkest
  '#c62828', '#ef6c00', '#f9a825', '#2e7d32', '#0277bd', '#6a1b9a', '#ad1457',
];

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#8b5cf6' });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      } else {
        console.error('API returned non-array data:', data);
        setTags([]);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
      const method = editingTag ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingTag(null);
        setFormData({ name: '', color: '#8b5cf6' });
        fetchTags();
      }
    } catch (error) {
      console.error('Error saving tag:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tag?')) return;

    try {
      await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#8b5cf6' });
    setShowModal(true);
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1f2937' },
    emptyState: {
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px', color: '#9ca3af',
    },
    emptyIcon: { fontSize: '64px', marginBottom: '16px', opacity: 0.5 },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tagList: { display: 'flex', flexWrap: 'wrap' as const, gap: '12px', padding: '24px' },
    tagItem: (color: string) => ({
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '8px 16px', borderRadius: '20px',
      backgroundColor: color, color: 'white',
      cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    }),
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
    modalContent: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '450px', maxWidth: '90%' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { fontSize: '18px', fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '4px', fontSize: '14px', color: '#10b981', fontWeight: '500' },
    input: {
      width: '100%', padding: '10px 12px',
      border: 'none', borderBottom: '2px solid #10b981',
      fontSize: '14px', outline: 'none',
    },
    colorPreview: {
      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
    },
    colorBox: (color: string) => ({
      width: '120px', height: '40px', borderRadius: '4px',
      backgroundColor: color,
    }),
    colorInputWrapper: {
      width: '50px', height: '40px', borderRadius: '4px',
      border: '1px solid #d1d5db', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    colorPalette: {
      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px',
      marginTop: '12px',
    },
    colorSwatch: (color: string, selected: boolean) => ({
      width: '32px', height: '32px', borderRadius: '4px',
      backgroundColor: color, cursor: 'pointer',
      border: selected ? '3px solid #1f2937' : '1px solid rgba(0,0,0,0.1)',
    }),
    submitButton: {
      padding: '12px 24px', backgroundColor: '#10b981', color: 'white',
      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
    },
    buttonGroup: {
      display: 'flex', justifyContent: 'flex-end', gap: '12px',
      backgroundColor: '#f8fafc', margin: '-24px', marginTop: '20px',
      padding: '16px 24px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px',
    },
    addButton: {
      width: '40px', height: '40px', borderRadius: '8px',
      backgroundColor: '#10b981', color: 'white', border: 'none',
      cursor: 'pointer', fontSize: '20px',
    },
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
          <h1 style={styles.title}>Tags</h1>
        </div>

        {tags.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⚠️</div>
            <p>Sem tags cadastradas</p>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={styles.tagList}>
              {tags.map(tag => (
                <div
                  key={tag.id}
                  style={styles.tagItem(tag.color)}
                  onClick={() => openEditModal(tag)}
                >
                  {tag.name}
                </div>
              ))}
            </div>
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
                  {editingTag ? 'Editar Tag' : 'Nova tag'}
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

                <div style={styles.colorPreview}>
                  <div style={styles.colorBox(formData.color)} />
                  <div style={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      style={{ width: '50px', height: '50px', border: 'none', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div style={styles.colorPalette}>
                  {colorPalette.map(color => (
                    <div
                      key={color}
                      style={styles.colorSwatch(color, formData.color === color)}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>

                <div style={styles.buttonGroup}>
                  {editingTag && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingTag.id)}
                      style={{ ...styles.submitButton, backgroundColor: '#ef4444' }}
                    >
                      Excluir
                    </button>
                  )}
                  <button type="submit" style={styles.submitButton}>
                    Salvar
                  </button>
                  <button type="button" style={styles.addButton}>+</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
