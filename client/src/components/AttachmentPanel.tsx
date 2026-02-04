import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File, X, AlertCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  attachmentType?: {
    id: string;
    name: string;
  };
}

interface AttachmentPanelProps {
  entityType: string;
  entityId: string;
  title?: string;
  readOnly?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  return File;
}

export default function AttachmentPanel({ entityType, entityId, title = 'Attachments', readOnly = false }: AttachmentPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Attachment | null>(null);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/attachments/${entityType}/${entityId}`);
      return data as Attachment[];
    },
    enabled: !!entityId
  });

  const { data: allowedConfig } = useQuery({
    queryKey: ['attachment-allowed'],
    queryFn: async () => {
      const { data } = await api.get('/attachments/allowed-extensions');
      return data as { extensions: string[]; mimeTypes: string[]; maxSizeMB: number };
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      toast.success('Attachment deleted');
      setDeleteConfirm(null);
    },
    onError: () => {
      toast.error('Failed to delete attachment');
      setDeleteConfirm(null);
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = (allowedConfig?.maxSizeMB || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${allowedConfig?.maxSizeMB || 5} MB`);
      return;
    }

    if (allowedConfig?.extensions && allowedConfig.extensions.length > 0) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedConfig.extensions.includes(fileExt)) {
        toast.error(`File type .${fileExt} is not allowed`);
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      await api.post(`/attachments/${entityType}/${entityId}`, formData);

      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      toast.success('File uploaded');
      setDescription('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const token = localStorage.getItem('accessToken');
    const downloadUrl = `/api/attachments/download/${attachment.id}?token=${encodeURIComponent(token || '')}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', attachment.originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Paperclip size={18} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
          {attachments && attachments.length > 0 && (
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '0.125rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
              {attachments.length}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        {!readOnly && (
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            border: '2px dashed var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-secondary)'
          }}>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
              id={`file-upload-${entityType}-${entityId}`}
            />

            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <label
              htmlFor={`file-upload-${entityType}-${entityId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1
              }}
            >
              <Upload size={18} />
              {uploading ? 'Uploading...' : 'Choose File to Upload'}
            </label>

            {allowedConfig?.extensions && allowedConfig.extensions.length > 0 && (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textAlign: 'center'
              }}>
                Allowed: {allowedConfig.extensions.map(e => `.${e}`).join(', ')} (max {allowedConfig.maxSizeMB}MB)
              </p>
            )}
            {(!allowedConfig?.extensions || allowedConfig.extensions.length === 0) && (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textAlign: 'center'
              }}>
                Max file size: 5MB
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
            Loading attachments...
          </div>
        ) : attachments?.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '2rem 1rem'
          }}>
            <Paperclip size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p style={{ margin: 0 }}>No attachments yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attachments?.map((attachment) => {
              const FileIcon = getFileIcon(attachment.mimeType);
              return (
                <div
                  key={attachment.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileIcon size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {attachment.originalName}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>{attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}</span>
                      <span>{format(new Date(attachment.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                    {attachment.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {attachment.description}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      onClick={() => handleDownload(attachment)}
                      style={{
                        padding: '0.375rem',
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => setDeleteConfirm(attachment)}
                        style={{
                          padding: '0.375rem',
                          background: 'none',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#ef4444'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="modal"
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Delete Attachment</h3>
            </div>
            
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Are you sure you want to delete <strong>{deleteConfirm.originalName}</strong>? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: 'white', border: 'none' }}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
