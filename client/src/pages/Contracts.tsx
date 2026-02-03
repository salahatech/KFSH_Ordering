import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, differenceInDays } from 'date-fns';
import { 
  Plus, 
  FileSignature, 
  Check, 
  X, 
  DollarSign, 
  Building2, 
  Calendar,
  CreditCard,
  Percent,
  FileText,
  Clock,
  AlertTriangle,
  Edit3,
  Trash2,
  Package,
  Paperclip,
} from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel';
import { KpiCard } from '../components/shared';

export default function Contracts() {
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailTab, setDetailTab] = useState<'info' | 'pricing' | 'attachments'>('info');
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', statusFilter],
    queryFn: async () => {
      const params: any = { includeExpired: 'true' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/contracts', { params });
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const [createForm, setCreateForm] = useState({
    customerId: '',
    name: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    paymentTermsDays: 30,
    creditLimit: '',
    discountPercent: 0,
    notes: '',
  });

  const [priceForm, setPriceForm] = useState({
    productId: '',
    unitPrice: '',
    priceUnit: 'per mCi',
    minimumQuantity: '',
    discountPercent: 0,
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/contracts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowCreateModal(false);
      resetCreateForm();
    },
  });

  const addPriceItemMutation = useMutation({
    mutationFn: async ({ contractId, data }: { contractId: string; data: any }) => {
      return api.post(`/contracts/${contractId}/price-items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowPriceModal(false);
      resetPriceForm();
      if (selectedContract) {
        const updated = contracts?.find((c: any) => c.id === selectedContract.id);
        if (updated) setSelectedContract(updated);
      }
    },
  });

  const deletePriceItemMutation = useMutation({
    mutationFn: async ({ contractId, itemId }: { contractId: string; itemId: string }) => {
      return api.delete(`/contracts/${contractId}/price-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/contracts/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.put(`/contracts/${id}/terminate`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setSelectedContract(null);
    },
  });

  const resetCreateForm = () => {
    setCreateForm({
      customerId: '',
      name: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      paymentTermsDays: 30,
      creditLimit: '',
      discountPercent: 0,
      notes: '',
    });
  };

  const resetPriceForm = () => {
    setPriceForm({
      productId: '',
      unitPrice: '',
      priceUnit: 'per mCi',
      minimumQuantity: '',
      discountPercent: 0,
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      ACTIVE: 'success',
      EXPIRED: 'warning',
      TERMINATED: 'danger',
    };
    return colors[status] || 'default';
  };

  const getContractProgress = (contract: any) => {
    const start = new Date(contract.startDate).getTime();
    const end = new Date(contract.endDate).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const getDaysRemaining = (contract: any) => {
    const end = new Date(contract.endDate);
    const now = new Date();
    return differenceInDays(end, now);
  };

  const handleCreate = () => {
    if (!createForm.customerId || !createForm.name) return;
    createContractMutation.mutate({
      customerId: createForm.customerId,
      name: createForm.name,
      startDate: createForm.startDate,
      endDate: createForm.endDate,
      paymentTermsDays: createForm.paymentTermsDays,
      creditLimit: createForm.creditLimit ? parseFloat(createForm.creditLimit) : undefined,
      discountPercent: createForm.discountPercent,
      notes: createForm.notes || undefined,
    });
  };

  const handleAddPrice = () => {
    if (!priceForm.productId || !priceForm.unitPrice || !selectedContract) return;
    addPriceItemMutation.mutate({
      contractId: selectedContract.id,
      data: {
        productId: priceForm.productId,
        unitPrice: parseFloat(priceForm.unitPrice),
        priceUnit: priceForm.priceUnit,
        minimumQuantity: priceForm.minimumQuantity ? parseInt(priceForm.minimumQuantity) : undefined,
        discountPercent: priceForm.discountPercent,
      },
    });
  };

  const activeContracts = contracts?.filter((c: any) => c.status === 'ACTIVE').length || 0;
  const totalCreditLimit = contracts?.reduce((sum: number, c: any) => sum + (c.creditLimit || 0), 0) || 0;
  const avgDiscount = contracts?.length ? 
    (contracts.reduce((sum: number, c: any) => sum + (c.discountPercent || 0), 0) / contracts.length).toFixed(1) : 0;
  const expiringContracts = contracts?.filter((c: any) => {
    if (c.status !== 'ACTIVE') return false;
    const days = getDaysRemaining(c);
    return days >= 0 && days <= 30;
  }).length || 0;

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Contracts & Pricing</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage customer contracts, payment terms, and product pricing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Contract
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Contracts" 
          value={contracts?.length || 0}
          icon={<FileText size={20} />}
          color="primary"
          onClick={() => setStatusFilter('')}
          selected={!statusFilter}
        />
        <KpiCard 
          title="Active" 
          value={activeContracts}
          icon={<Check size={20} />}
          color="success"
          onClick={() => setStatusFilter('ACTIVE')}
          selected={statusFilter === 'ACTIVE'}
        />
        <KpiCard 
          title="Total Credit" 
          value={`$${(totalCreditLimit / 1000).toFixed(0)}k`}
          icon={<CreditCard size={20} />}
          color="info"
        />
        <KpiCard 
          title="Expiring Soon" 
          value={expiringContracts}
          icon={<AlertTriangle size={20} />}
          color={expiringContracts > 0 ? 'warning' : 'default'}
          onClick={() => setStatusFilter('EXPIRING')}
          selected={statusFilter === 'EXPIRING'}
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedContract ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Customer</th>
                <th>Period</th>
                <th>Credit / Discount</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts?.map((contract: any) => {
                const daysRemaining = getDaysRemaining(contract);
                const progress = getContractProgress(contract);
                return (
                  <tr 
                    key={contract.id} 
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedContract?.id === contract.id ? 'var(--bg-secondary)' : undefined
                    }}
                    onClick={() => {
                      setSelectedContract(contract);
                      setDetailTab('info');
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{contract.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {contract.contractNumber}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: 'var(--bg-secondary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{contract.customer?.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {format(new Date(contract.startDate), 'MMM d, yyyy')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        to {format(new Date(contract.endDate), 'MMM d, yyyy')}
                      </div>
                      {contract.status === 'ACTIVE' && (
                        <div style={{ marginTop: '0.375rem' }}>
                          <div style={{ 
                            height: '4px', 
                            background: 'var(--border)', 
                            borderRadius: '2px',
                            overflow: 'hidden',
                            width: '100px'
                          }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${progress}%`,
                              background: daysRemaining <= 30 ? 'var(--warning)' : 'var(--success)',
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: daysRemaining <= 30 ? 'var(--warning)' : 'var(--text-muted)', marginTop: '0.125rem' }}>
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <CreditCard size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 500 }}>
                            {contract.creditLimit ? `$${contract.creditLimit.toLocaleString()}` : 'No limit'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Percent size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ color: contract.discountPercent > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: contract.discountPercent > 0 ? 500 : 400 }}>
                            {contract.discountPercent > 0 ? `${contract.discountPercent}% discount` : 'No discount'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {contract.status === 'DRAFT' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: 'none' }}
                            onClick={() => activateMutation.mutate(contract.id)}
                            disabled={activateMutation.isPending}
                            title="Activate Contract"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {contract.status === 'ACTIVE' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none' }}
                            onClick={() => {
                              const reason = prompt('Reason for termination:');
                              if (reason) terminateMutation.mutate({ id: contract.id, reason });
                            }}
                            disabled={terminateMutation.isPending}
                            title="Terminate Contract"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!contracts || contracts.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    <FileSignature size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                    <div>No contracts found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedContract && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ 
              padding: '1.25rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${getStatusColor(selectedContract.status)}`}>
                      {selectedContract.status}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                    {selectedContract.name}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'monospace', margin: 0 }}>
                    {selectedContract.contractNumber}
                  </p>
                </div>
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={() => setSelectedContract(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', padding: '0 1rem' }}>
                <button 
                  style={{ 
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === 'info' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                  onClick={() => setDetailTab('info')}
                >
                  Contract Info
                </button>
                <button 
                  style={{ 
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === 'pricing' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === 'pricing' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                  onClick={() => setDetailTab('pricing')}
                >
                  Product Pricing ({selectedContract.priceItems?.length || 0})
                </button>
                <button 
                  style={{ 
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === 'attachments' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === 'attachments' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                  onClick={() => setDetailTab('attachments')}
                >
                  <Paperclip size={14} /> Documents
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {detailTab === 'info' && (
                <>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      background: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <Building2 size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{selectedContract.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {selectedContract.customer?.code}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Contract Period
                    </span>
                  </div>
                  <div style={{ 
                    padding: '1rem', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius)',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Start</div>
                        <div style={{ fontWeight: 500 }}>{format(new Date(selectedContract.startDate), 'MMM d, yyyy')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>End</div>
                        <div style={{ fontWeight: 500 }}>{format(new Date(selectedContract.endDate), 'MMM d, yyyy')}</div>
                      </div>
                    </div>
                    {selectedContract.status === 'ACTIVE' && (
                      <>
                        <div style={{ 
                          height: '6px', 
                          background: 'var(--border)', 
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${getContractProgress(selectedContract)}%`,
                            background: getDaysRemaining(selectedContract) <= 30 ? 'var(--warning)' : 'var(--success)',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: getDaysRemaining(selectedContract) <= 30 ? 'var(--warning)' : 'var(--text-muted)',
                          textAlign: 'center'
                        }}>
                          {getDaysRemaining(selectedContract) > 0 
                            ? `${getDaysRemaining(selectedContract)} days remaining`
                            : 'Contract has expired'}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius)',
                      textAlign: 'center'
                    }}>
                      <Clock size={18} style={{ color: 'var(--primary)', marginBottom: '0.375rem' }} />
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Payment Terms
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                        Net {selectedContract.paymentTermsDays}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius)',
                      textAlign: 'center'
                    }}>
                      <Percent size={18} style={{ color: selectedContract.discountPercent > 0 ? 'var(--success)' : 'var(--text-muted)', marginBottom: '0.375rem' }} />
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Discount
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', color: selectedContract.discountPercent > 0 ? 'var(--success)' : undefined }}>
                        {selectedContract.discountPercent}%
                      </div>
                    </div>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius)',
                      textAlign: 'center'
                    }}>
                      <CreditCard size={18} style={{ color: '#10b981', marginBottom: '0.375rem' }} />
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Credit Limit
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                        {selectedContract.creditLimit ? `$${selectedContract.creditLimit.toLocaleString()}` : 'Unlimited'}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius)',
                      textAlign: 'center'
                    }}>
                      <FileText size={18} style={{ color: 'var(--primary)', marginBottom: '0.375rem' }} />
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Invoices
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                        {selectedContract._count?.invoices || 0}
                      </div>
                    </div>
                  </div>

                  {selectedContract.notes && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Notes
                      </div>
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'var(--bg-secondary)', 
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5
                      }}>
                        {selectedContract.notes}
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailTab === 'pricing' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Custom pricing for this contract
                    </div>
                    {selectedContract.status === 'DRAFT' && (
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowPriceModal(true)}
                      >
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>

                  {selectedContract.priceItems?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedContract.priceItems.map((item: any) => (
                        <div 
                          key={item.id}
                          style={{ 
                            padding: '1rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '8px', 
                            background: 'var(--bg-secondary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <Package size={18} style={{ color: 'var(--primary)' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, marginBottom: '0.125rem' }}>{item.product?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.product?.code}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              ${item.unitPrice.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              {item.priceUnit}
                            </div>
                          </div>
                          {item.discountPercent > 0 && (
                            <div style={{ 
                              background: 'rgba(34, 197, 94, 0.1)', 
                              color: 'var(--success)', 
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}>
                              -{item.discountPercent}%
                            </div>
                          )}
                          {selectedContract.status === 'DRAFT' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none' }}
                              onClick={() => deletePriceItemMutation.mutate({ contractId: selectedContract.id, itemId: item.id })}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2.5rem 1rem', 
                      color: 'var(--text-muted)',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)'
                    }}>
                      <DollarSign size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                      <div style={{ marginBottom: '0.25rem' }}>No custom pricing</div>
                      <div style={{ fontSize: '0.75rem' }}>Using default product rates</div>
                    </div>
                  )}
                </>
              )}

              {detailTab === 'attachments' && (
                <AttachmentPanel
                  entityType="CONTRACT"
                  entityId={selectedContract.id}
                  title="Contract Documents"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>New Contract</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Create a new customer contract with payment terms and pricing
              </p>
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select
                  className="form-select"
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                >
                  <option value="">Select a customer</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contract Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Annual Supply Agreement 2026"
                />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Terms (days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={createForm.paymentTermsDays}
                    onChange={(e) => setCreateForm({ ...createForm, paymentTermsDays: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={createForm.creditLimit}
                    onChange={(e) => setCreateForm({ ...createForm, creditLimit: e.target.value })}
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contract Discount (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createForm.discountPercent}
                  onChange={(e) => setCreateForm({ ...createForm, discountPercent: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes about this contract"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={createContractMutation.isPending || !createForm.customerId || !createForm.name}
              >
                {createContractMutation.isPending ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceModal && (
        <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Add Product Pricing</h3>
              <button onClick={() => setShowPriceModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Add custom pricing for a product in this contract
              </p>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select
                  className="form-select"
                  value={priceForm.productId}
                  onChange={(e) => setPriceForm({ ...priceForm, productId: e.target.value })}
                >
                  <option value="">Select a product</option>
                  {products?.filter((p: any) => 
                    !selectedContract?.priceItems?.some((item: any) => item.productId === p.id)
                  ).map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Unit Price ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={priceForm.unitPrice}
                    onChange={(e) => setPriceForm({ ...priceForm, unitPrice: e.target.value })}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price Unit</label>
                  <select
                    className="form-select"
                    value={priceForm.priceUnit}
                    onChange={(e) => setPriceForm({ ...priceForm, priceUnit: e.target.value })}
                  >
                    <option value="per mCi">per mCi</option>
                    <option value="per MBq">per MBq</option>
                    <option value="per dose">per dose</option>
                    <option value="per vial">per vial</option>
                  </select>
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Minimum Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={priceForm.minimumQuantity}
                    onChange={(e) => setPriceForm({ ...priceForm, minimumQuantity: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Discount (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={priceForm.discountPercent}
                    onChange={(e) => setPriceForm({ ...priceForm, discountPercent: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPriceModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddPrice}
                disabled={addPriceItemMutation.isPending || !priceForm.productId || !priceForm.unitPrice}
              >
                {addPriceItemMutation.isPending ? 'Adding...' : 'Add Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
