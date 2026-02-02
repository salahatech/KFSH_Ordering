import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, FileText, Check, X, Eye, DollarSign } from 'lucide-react';

export default function Contracts() {
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
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

  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/contracts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowCreateModal(false);
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
    },
  });

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      ACTIVE: 'success',
      EXPIRED: 'warning',
      TERMINATED: 'danger',
    };
    return colors[status] || 'default';
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

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Contracts & Pricing</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto' }}
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
            <Plus size={16} /> New Contract
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedContract ? '1fr 1fr' : '1fr' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Customer</th>
                <th>Period</th>
                <th>Credit Limit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts?.map((contract: any) => (
                <tr key={contract.id}>
                  <td style={{ fontFamily: 'monospace' }}>{contract.contractNumber}</td>
                  <td>{contract.customer?.name}</td>
                  <td>
                    {format(new Date(contract.startDate), 'MMM d, yyyy')} -{' '}
                    {format(new Date(contract.endDate), 'MMM d, yyyy')}
                  </td>
                  <td>
                    {contract.creditLimit ? `$${contract.creditLimit.toLocaleString()}` : '-'}
                  </td>
                  <td>
                    <span className={`badge badge-${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setSelectedContract(contract)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      {contract.status === 'DRAFT' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => activateMutation.mutate(contract.id)}
                          title="Activate"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {contract.status === 'ACTIVE' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            const reason = prompt('Reason for termination:');
                            if (reason) terminateMutation.mutate({ id: contract.id, reason });
                          }}
                          title="Terminate"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!contracts || contracts.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No contracts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedContract && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>{selectedContract.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedContract.contractNumber}
                </p>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedContract(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
                <div>{selectedContract.customer?.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <span className={`badge badge-${getStatusColor(selectedContract.status)}`}>
                  {selectedContract.status}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Terms</div>
                <div>Net {selectedContract.paymentTermsDays} days</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contract Discount</div>
                <div>{selectedContract.discountPercent}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Credit Limit</div>
                <div>{selectedContract.creditLimit ? `$${selectedContract.creditLimit.toLocaleString()}` : 'No limit'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invoices</div>
                <div>{selectedContract._count?.invoices || 0}</div>
              </div>
            </div>

            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Product Pricing</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {selectedContract.priceItems?.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.product?.name}</td>
                    <td>${item.unitPrice.toFixed(2)} {item.priceUnit}</td>
                    <td>{item.discountPercent}%</td>
                  </tr>
                ))}
                {(!selectedContract.priceItems || selectedContract.priceItems.length === 0) && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No pricing configured - using default rates
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Create Contract</h3>
            <div className="form-group">
              <label>Customer *</label>
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
              <label>Contract Name *</label>
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
                <label>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
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
                <label>Payment Terms (days)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createForm.paymentTermsDays}
                  onChange={(e) => setCreateForm({ ...createForm, paymentTermsDays: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Credit Limit ($)</label>
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
              <label>Contract Discount (%)</label>
              <input
                type="number"
                className="form-input"
                value={createForm.discountPercent}
                onChange={(e) => setCreateForm({ ...createForm, discountPercent: parseFloat(e.target.value) })}
                min="0"
                max="100"
                step="0.5"
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                className="form-input"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={createContractMutation.isPending}
              >
                {createContractMutation.isPending ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
