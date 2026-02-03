import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Plus, Edit2, Trash2, X, FileType, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface AttachmentType {
  id: string;
  name: string;
  extensions: string[];
  mimeTypes: string[];
  maxSizeMB: number;
  isActive: boolean;
}

export default function AttachmentSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AttachmentType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    extensions: '',
    mimeTypes: '',
    maxSizeMB: 5,
    isActive: true
  });

  const { data: types, isLoading } = useQuery({
    queryKey: ['attachment-types'],
    queryFn: async () => {
      const { data } = await api.get('/attachments/types');
      return data as AttachmentType[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingType) {
        await api.put(`/attachments/types/${editingType.id}`, payload);
      } else {
        await api.post('/attachments/types', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-types'] });
      toast.success(editingType ? 'Type updated' : 'Type created');
      closeModal();
    },
    onError: () => {
      toast.error('Failed to save attachment type');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attachments/types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-types'] });
      toast.success('Type deleted');
    },
    onError: () => {
      toast.error('Cannot delete type with existing attachments');
    }
  });

  const openModal = (type?: AttachmentType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        extensions: type.extensions.join(', '),
        mimeTypes: type.mimeTypes.join(', '),
        maxSizeMB: type.maxSizeMB,
        isActive: type.isActive
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        extensions: '',
        mimeTypes: '',
        maxSizeMB: 5,
        isActive: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name.trim(),
      extensions: formData.extensions.split(',').map(s => s.trim().toLowerCase().replace(/^\./, '')).filter(Boolean),
      mimeTypes: formData.mimeTypes.split(',').map(s => s.trim()).filter(Boolean),
      maxSizeMB: Number(formData.maxSizeMB),
      isActive: formData.isActive
    };
    
    saveMutation.mutate(payload);
  };

  const commonExtensions = [
    { label: 'PDF Documents', value: 'pdf', mime: 'application/pdf' },
    { label: 'Images (JPG)', value: 'jpg, jpeg', mime: 'image/jpeg' },
    { label: 'Images (PNG)', value: 'png', mime: 'image/png' },
    { label: 'Word Documents', value: 'doc, docx', mime: 'application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { label: 'Excel Files', value: 'xls, xlsx', mime: 'application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { label: 'Text Files', value: 'txt', mime: 'text/plain' },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Attachment Types</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Configure allowed file types and extensions for attachments
          </p>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          <Plus size={18} />
          Add Type
        </button>
      </div>

      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : types?.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FileType size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem' }}>No attachment types defined</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              All file types are currently allowed. Add types to restrict uploads.
            </p>
            <button
              onClick={() => openModal()}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Add First Type
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Extensions</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Max Size</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types?.map((type) => (
                <tr key={type.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{type.name}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {type.extensions.map((ext) => (
                        <span key={ext} style={{
                          padding: '0.125rem 0.5rem',
                          background: 'var(--primary)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}>
                          .{ext}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>{type.maxSizeMB} MB</td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: type.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                      color: type.isActive ? '#22c55e' : '#9ca3af'
                    }}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openModal(type)}
                        style={{
                          padding: '0.375rem',
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this attachment type?')) {
                            deleteMutation.mutate(type.id);
                          }
                        }}
                        style={{
                          padding: '0.375rem',
                          background: 'none',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#ef4444'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>How it works</h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          When no types are defined, all file types up to 5MB are allowed. Once you add types, only files matching 
          the defined extensions will be accepted. The maximum file size limit of 5MB applies globally.
        </p>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>{editingType ? 'Edit' : 'Add'} Attachment Type</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Type Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Documents, Images, Certificates"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Allowed Extensions
                </label>
                <input
                  type="text"
                  value={formData.extensions}
                  onChange={(e) => setFormData({ ...formData, extensions: e.target.value })}
                  placeholder="pdf, doc, docx, jpg, png"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Comma-separated list of extensions (without dots)
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Quick Add
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {commonExtensions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const currentExts = formData.extensions.split(',').map(s => s.trim()).filter(Boolean);
                        const newExts = item.value.split(',').map(s => s.trim());
                        const merged = [...new Set([...currentExts, ...newExts])];
                        
                        const currentMimes = formData.mimeTypes.split(',').map(s => s.trim()).filter(Boolean);
                        const newMimes = item.mime.split(',').map(s => s.trim());
                        const mergedMimes = [...new Set([...currentMimes, ...newMimes])];
                        
                        setFormData({
                          ...formData,
                          extensions: merged.join(', '),
                          mimeTypes: mergedMimes.join(', ')
                        });
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  MIME Types (optional)
                </label>
                <input
                  type="text"
                  value={formData.mimeTypes}
                  onChange={(e) => setFormData({ ...formData, mimeTypes: e.target.value })}
                  placeholder="application/pdf, image/jpeg"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Max Size (MB)
                  </label>
                  <input
                    type="number"
                    value={formData.maxSizeMB}
                    onChange={(e) => setFormData({ ...formData, maxSizeMB: Number(e.target.value) })}
                    min={0.1}
                    max={5}
                    step={0.5}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '0.625rem 1rem',
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Save size={16} />
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
