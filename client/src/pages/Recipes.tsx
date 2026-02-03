import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Plus, Edit2, X, Search, Filter, FileText, CheckCircle, Clock, AlertCircle, Copy, Send, Trash2,
  ChevronRight, ChevronDown, ListOrdered, Package, Layers, PenTool, HelpCircle, ChevronUp, ArrowRight
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, EmptyState } from '../components/shared';
import ESignatureModal from '../components/ESignatureModal';
import ESignatureHistory from '../components/ESignatureHistory';

const STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'var(--text-muted)', icon: FileText },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'var(--warning)', icon: Clock },
  { value: 'ACTIVE', label: 'Active', color: 'var(--success)', icon: CheckCircle },
  { value: 'SUPERSEDED', label: 'Superseded', color: 'var(--text-muted)', icon: Layers },
  { value: 'OBSOLETE', label: 'Obsolete', color: 'var(--error)', icon: AlertCircle },
];

const statusDescriptions: Record<string, { label: string; description: string; nextAction: string }> = {
  DRAFT: { 
    label: 'Draft', 
    description: 'Recipe is being developed. Can be edited and components added.', 
    nextAction: 'Submit for approval when ready' 
  },
  PENDING_APPROVAL: { 
    label: 'Pending Approval', 
    description: 'Recipe submitted and awaiting QA approval with e-signature.', 
    nextAction: 'QA approves and activates with signature' 
  },
  ACTIVE: { 
    label: 'Active', 
    description: 'Recipe is approved and can be used in production.', 
    nextAction: 'Create new version for changes' 
  },
  SUPERSEDED: { 
    label: 'Superseded', 
    description: 'Recipe replaced by a newer version.', 
    nextAction: 'Reference only - use active version' 
  },
  OBSOLETE: { 
    label: 'Obsolete', 
    description: 'Recipe no longer valid for production.', 
    nextAction: 'Historical reference only' 
  },
};

export default function Recipes() {
  const [showModal, setShowModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [detailRecipe, setDetailRecipe] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showESignModal, setShowESignModal] = useState(false);
  const [recipeToActivate, setRecipeToActivate] = useState<any>(null);
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({});
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes', statusFilter, productFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (productFilter) params.append('productId', productFilter);
      if (searchQuery) params.append('search', searchQuery);
      const { data } = await api.get(`/recipes?${params.toString()}`);
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

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data } = await api.get('/materials?status=ACTIVE');
      return data;
    },
  });

  const { data: recipeDetail } = useQuery({
    queryKey: ['recipe', detailRecipe?.id],
    queryFn: async () => {
      if (!detailRecipe?.id) return null;
      const { data } = await api.get(`/recipes/${detailRecipe.id}`);
      return data;
    },
    enabled: !!detailRecipe?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedRecipe) {
        return api.put(`/recipes/${selectedRecipe.id}`, data);
      }
      return api.post('/recipes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setShowModal(false);
      setSelectedRecipe(null);
      toast.success(selectedRecipe ? 'Recipe Updated' : 'Recipe Created', 
        selectedRecipe ? 'Recipe details have been updated' : 'New recipe has been created');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to save recipe');
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/recipes/${id}/submit-for-approval`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Submitted', 'Recipe has been submitted for approval');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to submit recipe');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, signatureId }: { id: string, signatureId: string }) => {
      return api.post(`/recipes/${id}/activate`, { signatureId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeToActivate(null);
      toast.success('Recipe Activated', 'Recipe is now active and can be used in production');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to activate recipe');
    },
  });

  const createNewVersionMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/recipes/${id}/create-new-version`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('New Version Created', `Version ${response.data.version} has been created as a draft`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to create new version');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe Deleted', 'Recipe has been removed');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to delete recipe');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const componentsJson = formData.get('componentsJson') as string;
    const stepsJson = formData.get('stepsJson') as string;
    
    createMutation.mutate({
      code: formData.get('code'),
      name: formData.get('name'),
      productId: formData.get('productId'),
      description: formData.get('description') || null,
      yieldQuantity: parseFloat(formData.get('yieldQuantity') as string),
      yieldUnit: formData.get('yieldUnit'),
      yieldTolerance: parseFloat(formData.get('yieldTolerance') as string) || 5,
      synthesisTimeMinutes: parseInt(formData.get('synthesisTimeMinutes') as string) || null,
      totalTimeMinutes: parseInt(formData.get('totalTimeMinutes') as string) || null,
      specialInstructions: formData.get('specialInstructions') || null,
      safetyPrecautions: formData.get('safetyPrecautions') || null,
      equipmentRequirements: formData.get('equipmentRequirements') || null,
      qualityNotes: formData.get('qualityNotes') || null,
      components: componentsJson ? JSON.parse(componentsJson) : [],
      steps: stepsJson ? JSON.parse(stepsJson) : [],
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      PENDING_APPROVAL: 'warning',
      ACTIVE: 'success',
      SUPERSEDED: 'default',
      OBSOLETE: 'danger',
    };
    return colors[status] || 'default';
  };

  const toggleComponents = (id: string) => {
    setExpandedComponents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const recipes = recipesData?.recipes || recipesData || [];
  const stats = {
    total: recipes.length,
    active: recipes.filter((r: any) => r.status === 'ACTIVE').length,
    draft: recipes.filter((r: any) => r.status === 'DRAFT').length,
    pending: recipes.filter((r: any) => r.status === 'PENDING_APPROVAL').length,
    superseded: recipes.filter((r: any) => r.status === 'SUPERSEDED').length,
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Recipes & BOM</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Manage product recipes and bills of materials
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
          >
            <HelpCircle size={16} />
            Workflow Guide
            {showWorkflowGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Create Recipe
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Recipes" 
          value={stats.total} 
          icon={<FileText size={20} />}
          color="primary"
          onClick={() => setStatusFilter('')}
          selected={!statusFilter}
        />
        <KpiCard 
          title="Active" 
          value={stats.active} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setStatusFilter('ACTIVE')}
          selected={statusFilter === 'ACTIVE'}
        />
        <KpiCard 
          title="Drafts" 
          value={stats.draft} 
          icon={<Edit2 size={20} />}
          color="default"
          onClick={() => setStatusFilter('DRAFT')}
          selected={statusFilter === 'DRAFT'}
        />
        <KpiCard 
          title="Pending Approval" 
          value={stats.pending} 
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => setStatusFilter('PENDING_APPROVAL')}
          selected={statusFilter === 'PENDING_APPROVAL'}
        />
        <KpiCard 
          title="Superseded" 
          value={stats.superseded} 
          icon={<Layers size={20} />}
          color="default"
          onClick={() => setStatusFilter('SUPERSEDED')}
          selected={statusFilter === 'SUPERSEDED'}
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="">All Products</option>
            {products?.map((prod: any) => (
              <option key={prod.id} value={prod.id}>{prod.name}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(searchQuery || productFilter || statusFilter) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setSearchQuery(''); setProductFilter(''); setStatusFilter(''); }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {showWorkflowGuide && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
            Recipe Versioning Workflow
          </h3>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Recipes follow a controlled versioning workflow with e-signature approval:
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
          }}>
            {['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUPERSEDED'].map((status, idx, arr) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge status={status} size="sm" />
                {idx < arr.length - 1 && <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(statusDescriptions).map(([status, info]) => (
              <div key={status} style={{ 
                padding: '0.75rem', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid var(--${getStatusColor(status) === 'default' ? 'secondary' : getStatusColor(status)})`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <StatusBadge status={status} size="sm" />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {info.description}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <strong>Next:</strong> {info.nextAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: detailRecipe ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
              Recipe List ({recipes.length})
            </h3>
          </div>
          {recipes.length === 0 ? (
            <div style={{ padding: '2rem' }}>
              <EmptyState 
                icon="package"
                title="No Recipes Found"
                message={searchQuery || statusFilter || productFilter 
                  ? "No recipes match your search criteria" 
                  : "Get started by creating your first recipe"}
                ctaLabel={!searchQuery && !statusFilter && !productFilter ? "Create Recipe" : undefined}
                onCta={!searchQuery && !statusFilter && !productFilter ? () => setShowModal(true) : undefined}
              />
            </div>
          ) : (
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Recipe</th>
                  <th>Product</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Components</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe: any) => (
                  <tr 
                    key={recipe.id} 
                    onClick={() => setDetailRecipe(recipe)}
                    style={{ cursor: 'pointer', background: detailRecipe?.id === recipe.id ? 'var(--bg-hover)' : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{recipe.code}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{recipe.name}</div>
                    </td>
                    <td>
                      <span style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: 'var(--primary)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8125rem',
                      }}>
                        {recipe.product?.name}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>v{recipe.version}</span>
                    </td>
                    <td>
                      <StatusBadge status={recipe.status} size="sm" />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <Package size={14} style={{ color: 'var(--text-muted)' }} />
                        {recipe._count?.components || 0}
                        <span style={{ color: 'var(--text-muted)' }}>|</span>
                        <ListOrdered size={14} style={{ color: 'var(--text-muted)' }} />
                        {recipe._count?.steps || 0}
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {recipe.status === 'DRAFT' && (
                          <>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => { setSelectedRecipe(recipe); setShowModal(true); }}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => submitForApprovalMutation.mutate(recipe.id)}
                              title="Submit for Approval"
                              disabled={submitForApprovalMutation.isPending}
                            >
                              <Send size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                if (confirm('Delete this draft recipe?')) {
                                  deleteMutation.mutate(recipe.id);
                                }
                              }}
                              title="Delete"
                              style={{ color: 'var(--error)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {recipe.status === 'PENDING_APPROVAL' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => { setRecipeToActivate(recipe); setShowESignModal(true); }}
                            title="Activate with E-Signature"
                          >
                            <PenTool size={14} /> Activate
                          </button>
                        )}
                        {(recipe.status === 'ACTIVE' || recipe.status === 'SUPERSEDED') && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => createNewVersionMutation.mutate(recipe.id)}
                            title="Create New Version"
                            disabled={createNewVersionMutation.isPending}
                          >
                            <Copy size={14} /> New Version
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {detailRecipe && recipeDetail && (
          <div className="card" style={{ padding: 0, position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 150px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              padding: '1.25rem', 
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem' }}>{recipeDetail.code}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{recipeDetail.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>v{recipeDetail.version}</span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setDetailRecipe(null)}
                    style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <StatusBadge status={recipeDetail.status} size="md" />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Product
                </div>
                <span style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: 'var(--primary)',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}>
                  {recipeDetail.product?.name}
                </span>
              </div>

              {recipeDetail.description && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Description
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{recipeDetail.description}</div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Yield Information
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Expected Yield</div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{recipeDetail.yieldQuantity} {recipeDetail.yieldUnit}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Tolerance</div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>±{recipeDetail.yieldTolerance}%</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}
                  onClick={() => toggleComponents(recipeDetail.id)}
                >
                  {expandedComponents[recipeDetail.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bill of Materials ({recipeDetail.components?.length || 0})
                  </div>
                </div>
                {expandedComponents[recipeDetail.id] && (
                  <div style={{ marginLeft: '1.5rem' }}>
                    {recipeDetail.components?.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>No components defined</div>
                    ) : (
                      recipeDetail.components?.map((comp: any) => (
                        <div key={comp.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '0.5rem 0',
                          borderBottom: '1px solid var(--border)',
                          fontSize: '0.875rem',
                        }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{comp.material?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {comp.material?.code}
                              {comp.isCritical && (
                                <span style={{ color: 'var(--error)', marginLeft: '0.5rem' }}>Critical</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 500 }}>{comp.quantity} {comp.unit}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>±{comp.tolerancePercent}%</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {recipeDetail.steps?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Process Steps ({recipeDetail.steps.length})
                  </div>
                  {recipeDetail.steps.map((step: any) => (
                    <div key={step.id} style={{ 
                      padding: '0.5rem 0.75rem',
                      marginBottom: '0.5rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          background: 'var(--primary)',
                          color: 'white',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                        }}>
                          {step.stepNumber}
                        </span>
                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{step.title}</span>
                        {step.qualityCheckpoint && (
                          <span title="QC Checkpoint"><CheckCircle size={14} style={{ color: 'var(--success)' }} /></span>
                        )}
                      </div>
                      {step.description && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '30px', marginTop: '0.25rem' }}>
                          {step.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {recipeDetail.activatedAt && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Activation Details
                  </div>
                  <div style={{ fontSize: '0.875rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius)' }}>
                    <div><strong>Activated By:</strong> {recipeDetail.activatedBy?.firstName} {recipeDetail.activatedBy?.lastName}</div>
                    <div><strong>Date:</strong> {new Date(recipeDetail.activatedAt).toLocaleString()}</div>
                  </div>
                  {recipeDetail.activationSignatureId && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <ESignatureHistory 
                        entityType="Recipe" 
                        entityId={recipeDetail.id}
                        compact
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <RecipeFormModal
          recipe={selectedRecipe}
          products={products || []}
          materials={materials || []}
          onClose={() => { setShowModal(false); setSelectedRecipe(null); }}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
        />
      )}

      {showESignModal && recipeToActivate && (
        <ESignatureModal
          isOpen={showESignModal}
          onClose={() => { setShowESignModal(false); setRecipeToActivate(null); }}
          onSuccess={(signature) => {
            activateMutation.mutate({ id: recipeToActivate.id, signatureId: signature.id });
            setShowESignModal(false);
          }}
          scope="RECIPE_ACTIVATION"
          entityType="Recipe"
          entityId={recipeToActivate.id}
          title="Activate Recipe"
          description={`You are about to activate recipe ${recipeToActivate.code} v${recipeToActivate.version}. This will make it the active recipe for production and supersede any previous active version.`}
        />
      )}
    </div>
  );
}

function RecipeFormModal({ 
  recipe, products, materials, onClose, onSubmit, isPending 
}: { 
  recipe: any; 
  products: any[]; 
  materials: any[]; 
  onClose: () => void; 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; 
  isPending: boolean;
}) {
  const [components, setComponents] = useState<any[]>(recipe?.components || []);
  const [steps, setSteps] = useState<any[]>(recipe?.steps || []);

  const addComponent = () => {
    setComponents([...components, {
      materialId: '',
      quantity: 0,
      unit: '',
      tolerancePercent: 5,
      isOptional: false,
      isCritical: false,
    }]);
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'materialId') {
      const mat = materials.find(m => m.id === value);
      if (mat) updated[index].unit = mat.unit;
    }
    setComponents(updated);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps([...steps, {
      stepNumber: steps.length + 1,
      title: '',
      description: '',
      durationMinutes: null,
      qualityCheckpoint: false,
    }]);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>{recipe ? 'Edit Recipe' : 'Create Recipe'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const hiddenComponents = document.createElement('input');
          hiddenComponents.type = 'hidden';
          hiddenComponents.name = 'componentsJson';
          hiddenComponents.value = JSON.stringify(components);
          form.appendChild(hiddenComponents);
          
          const hiddenSteps = document.createElement('input');
          hiddenSteps.type = 'hidden';
          hiddenSteps.name = 'stepsJson';
          hiddenSteps.value = JSON.stringify(steps);
          form.appendChild(hiddenSteps);
          
          onSubmit(e);
        }}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Recipe Code *</label>
                <input
                  type="text"
                  name="code"
                  className="form-input"
                  defaultValue={recipe?.code || ''}
                  required
                  placeholder="e.g., RCP-FDG-001"
                  disabled={!!recipe}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  defaultValue={recipe?.name || ''}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select 
                  name="productId" 
                  className="form-select" 
                  defaultValue={recipe?.productId || ''} 
                  required
                  disabled={!!recipe}
                >
                  <option value="">Select Product</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>{prod.code} - {prod.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                rows={2}
                defaultValue={recipe?.description || ''}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Yield Quantity *</label>
                <input
                  type="number"
                  name="yieldQuantity"
                  className="form-input"
                  defaultValue={recipe?.yieldQuantity || ''}
                  required
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yield Unit *</label>
                <input
                  type="text"
                  name="yieldUnit"
                  className="form-input"
                  defaultValue={recipe?.yieldUnit || 'mCi'}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tolerance (%)</label>
                <input
                  type="number"
                  name="yieldTolerance"
                  className="form-input"
                  defaultValue={recipe?.yieldTolerance || 5}
                  step="0.1"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Synthesis Time (min)</label>
                <input
                  type="number"
                  name="synthesisTimeMinutes"
                  className="form-input"
                  defaultValue={recipe?.synthesisTimeMinutes || ''}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Time (min)</label>
                <input
                  type="number"
                  name="totalTimeMinutes"
                  className="form-input"
                  defaultValue={recipe?.totalTimeMinutes || ''}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>Bill of Materials ({components.length})</h4>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addComponent}>
                  <Plus size={14} /> Add Component
                </button>
              </div>
              {components.map((comp, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    value={comp.materialId}
                    onChange={(e) => updateComponent(idx, 'materialId', e.target.value)}
                    required
                  >
                    <option value="">Select Material</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Qty"
                    value={comp.quantity}
                    onChange={(e) => updateComponent(idx, 'quantity', parseFloat(e.target.value))}
                    step="0.01"
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={comp.unit}
                    onChange={(e) => updateComponent(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="±%"
                    value={comp.tolerancePercent}
                    onChange={(e) => updateComponent(idx, 'tolerancePercent', parseFloat(e.target.value))}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={comp.isCritical}
                      onChange={(e) => updateComponent(idx, 'isCritical', e.target.checked)}
                    />
                    Critical
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeComponent(idx)} style={{ color: 'var(--error)' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>Process Steps ({steps.length})</h4>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addStep}>
                  <Plus size={14} /> Add Step
                </button>
              </div>
              {steps.map((step, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 2fr auto auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ 
                    background: 'var(--primary)', 
                    color: 'white', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {step.stepNumber}
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Step Title"
                    value={step.title}
                    onChange={(e) => updateStep(idx, 'title', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Description"
                    value={step.description}
                    onChange={(e) => updateStep(idx, 'description', e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={step.qualityCheckpoint}
                      onChange={(e) => updateStep(idx, 'qualityCheckpoint', e.target.checked)}
                    />
                    QC
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStep(idx)} style={{ color: 'var(--error)' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : (recipe ? 'Update Recipe' : 'Create Recipe')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
