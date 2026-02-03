# RadioPharma OMS Design System

This document outlines the unified design system for the RadioPharma OMS application.

## Typography

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Arabic**: IBM Plex Sans Arabic, Tajawal, sans-serif
- **Monospace**: JetBrains Mono, Fira Code, monospace

### Font Sizes
| Token | Size | Usage |
|-------|------|-------|
| xs | 11px (0.6875rem) | Labels, badges, micro text |
| sm | 12px (0.75rem) | Secondary text, table cells |
| base | 14px (0.875rem) | Body text, form inputs |
| md | 16px (1rem) | Emphasized text |
| lg | 18px (1.125rem) | Section headers |
| xl | 20px (1.25rem) | Page titles |
| 2xl | 24px (1.5rem) | Large headings |
| 3xl | 32px (2rem) | Hero text |

### Font Weights
- normal: 400
- medium: 500
- semibold: 600
- bold: 700

## Color Palette

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| primary | #2563eb | Primary actions, links |
| primaryHover | #1d4ed8 | Hover states |
| primaryLight | #3b82f6 | Lighter accent |
| primarySoft | #eff6ff | Backgrounds |

### Semantic Colors
| Type | Main | Light | Dark |
|------|------|-------|------|
| Success | #22c55e | #f0fdf4 | #166534 |
| Warning | #f59e0b | #fffbeb | #92400e |
| Danger | #ef4444 | #fef2f2 | #991b1b |
| Info | #0ea5e9 | #f0f9ff | #0369a1 |

### Neutral Colors
- 50: #f8fafc (lightest background)
- 100: #f1f5f9 (secondary background)
- 200: #e2e8f0 (borders)
- 300: #cbd5e1 (dark borders)
- 400: #94a3b8 (muted text)
- 500: #64748b (secondary text)
- 600: #475569 (primary text light)
- 700: #334155
- 800: #1e293b
- 900: #0f172a (primary text)

## Status Colors

All statuses use the centralized `statusColors.ts` mapping. Example statuses:

| Status | Background | Text |
|--------|------------|------|
| DRAFT | #f1f5f9 | #475569 |
| PENDING_APPROVAL | #fef3c7 | #92400e |
| APPROVED | #dcfce7 | #166534 |
| REJECTED | #fee2e2 | #991b1b |
| IN_TRANSIT | #ede9fe | #6d28d9 |
| DELIVERED | #dcfce7 | #166534 |

**Usage:**
\`\`\`tsx
import { StatusBadge } from '@/components/shared';
<StatusBadge status="APPROVED" />
\`\`\`

## Spacing

| Token | Size | Pixels |
|-------|------|--------|
| 1 | 0.25rem | 4px |
| 2 | 0.5rem | 8px |
| 3 | 0.75rem | 12px |
| 4 | 1rem | 16px |
| 5 | 1.25rem | 20px |
| 6 | 1.5rem | 24px |
| 8 | 2rem | 32px |

## Border Radii

| Token | Size | Usage |
|-------|------|-------|
| sm | 4px | Small elements, badges |
| md | 6px | Buttons, inputs |
| base | 8px | Cards, modals |
| lg | 12px | Large cards |
| full | 9999px | Pills, avatars |

## Shadows

| Token | Usage |
|-------|-------|
| sm | Subtle elevation |
| base | Cards, dropdowns |
| md | Modals, popovers |
| lg | High emphasis |

## Core Components

### Button
\`\`\`tsx
import { Button } from '@/components/shared';

<Button variant="primary" size="md">Create</Button>
<Button variant="secondary" size="sm" icon={<Plus size={14} />}>Add</Button>
<Button variant="danger" loading>Deleting...</Button>
\`\`\`

**Variants:** primary, secondary, ghost, danger, success, warning, link
**Sizes:** sm, md, lg

### Input / Select / Textarea
\`\`\`tsx
import { Input, Select, Textarea } from '@/components/shared';

<Input label="Name" error="Required field" required />
<Select label="Status" options={[{ value: 'ACTIVE', label: 'Active' }]} />
<Textarea label="Notes" hint="Optional notes" />
\`\`\`

### StatusBadge
\`\`\`tsx
import { StatusBadge } from '@/components/shared';

<StatusBadge status="APPROVED" />
<StatusBadge status="IN_TRANSIT" showDot size="lg" />
\`\`\`

### KpiCard
\`\`\`tsx
import { KpiCard } from '@/components/shared';

<KpiCard
  title="Total Orders"
  value={150}
  icon={<Package size={24} />}
  color="primary"
  onClick={() => handleFilter()}
  active={isActive}
/>
\`\`\`

### Card
\`\`\`tsx
import { Card, CardHeader, CardSection } from '@/components/shared';

<Card padding="md">
  <CardHeader title="Details" subtitle="View information" />
  <CardSection title="Contact Info">
    ...content
  </CardSection>
</Card>
\`\`\`

### DataTable
\`\`\`tsx
import { DataTable, type Column } from '@/components/shared';

const columns: Column<Order>[] = [
  { key: 'orderNumber', header: 'Order #', sortable: true },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];

<DataTable
  columns={columns}
  data={orders}
  getRowKey={(row) => row.id}
  onRowClick={(row) => selectOrder(row)}
  selectedRow={selectedOrder}
  page={page}
  pageSize={20}
  totalCount={totalCount}
  onPageChange={setPage}
/>
\`\`\`

### PageHeader
\`\`\`tsx
import { PageHeader } from '@/components/shared';

<PageHeader
  title="Purchase Orders"
  subtitle="Manage procurement"
  status="ACTIVE"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Procurement', href: '/procurement' },
    { label: 'Purchase Orders' },
  ]}
  actions={<Button variant="primary">Create PO</Button>}
/>
\`\`\`

### FilterBar
\`\`\`tsx
import { FilterBar, type FilterWidget } from '@/components/shared';

const widgets: FilterWidget[] = [
  { key: 'search', label: 'Search', type: 'search', placeholder: 'Search...' },
  { key: 'status', label: 'Status', type: 'select', options: [...] },
];

<FilterBar
  widgets={widgets}
  values={filterValues}
  onChange={(key, value) => setFilters({ ...filters, [key]: value })}
  onReset={() => setFilters({})}
/>
\`\`\`

## Layout Templates

### List Page Layout
Use for pages showing lists/tables of records (Orders, Products, Purchase Orders).

\`\`\`tsx
import { ListPageLayout } from '@/components/layouts';

<ListPageLayout
  title="Products"
  subtitle="Manage product catalog"
  actions={<Button>Add Product</Button>}
  kpis={[
    { title: 'Total', value: 50, color: 'primary', filterKey: 'status', filterValue: '' },
    { title: 'Active', value: 45, color: 'success', filterKey: 'status', filterValue: 'ACTIVE' },
  ]}
  onKpiClick={handleKpiFilter}
  activeKpiFilter={currentFilter}
  filterWidgets={filterWidgets}
  filterValues={filters}
  onFilterChange={handleFilterChange}
  loading={isLoading}
  isEmpty={data.length === 0}
  emptyTitle="No products"
  emptyMessage="Create your first product"
  detailPanel={selectedItem && <DetailPanel item={selectedItem} />}
>
  <DataTable ... />
</ListPageLayout>
\`\`\`

### Detail Page Layout
Use for individual record detail pages.

\`\`\`tsx
import { DetailPageLayout } from '@/components/layouts';

<DetailPageLayout
  title={order.orderNumber}
  status={order.status}
  breadcrumbs={[...]}
  actions={<Button>Edit</Button>}
  kpis={[...]}
  tabs={[
    { key: 'overview', label: 'Overview', content: <OverviewTab /> },
    { key: 'items', label: 'Items', badge: order.items.length, content: <ItemsTab /> },
    { key: 'documents', label: 'Documents', content: <DocumentsTab /> },
  ]}
  linkedRecords={[...]}
  showTimeline
  timelineEvents={auditLogs}
/>
\`\`\`

## Form Validation UX

### Error Display
- Inline field errors with red border and error message below
- Use AlertCircle icon with error text
- Required fields marked with red asterisk

### Form States
- Disabled submit button while saving (show loading spinner)
- Show "Form saved" success toast on completion
- Confirmation modal for destructive actions

## Best Practices

1. **Always use StatusBadge** for status displays - never create custom badges
2. **Use KpiCard** for metrics - make them clickable for filtering when appropriate
3. **Use PageHeader** consistently - include breadcrumbs for nested pages
4. **Use DataTable** for tabular data - leverage built-in pagination and sorting
5. **Use ListPageLayout/DetailPageLayout** - ensures consistent page structure
6. **Reference theme tokens** - never hardcode colors or spacing values

## File Structure

\`\`\`
src/
├── theme/
│   ├── tokens.ts          # Design tokens (typography, colors, spacing)
│   ├── statusColors.ts    # Status color mapping
│   └── index.ts           # Theme exports
├── components/
│   ├── shared/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── DataTable.tsx
│   │   ├── Input.tsx
│   │   ├── KpiCard.tsx
│   │   ├── PageHeader.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── FilterBar.tsx
│   │   ├── EmptyState.tsx
│   │   └── index.ts
│   └── layouts/
│       ├── ListPageLayout.tsx
│       ├── DetailPageLayout.tsx
│       └── index.ts
└── design-system/
    └── README.md          # This documentation
\`\`\`
