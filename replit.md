# RadioPharma OMS - Order Management System

## Overview
A comprehensive web application for managing radiopharmaceutical manufacturing operations, including ordering, production planning, QC testing, batch release, delivery, dose dispensing, capacity management, contracts/pricing, and invoicing. The system handles time-critical, decay-based products (PET and SPECT radiopharmaceuticals) with GMP-style traceability, radioactive decay calculations, and backward scheduling based on delivery times and product half-lives.

## Project Status
**Current State**: Fully functional MVP with all core features implemented including financial modules, capacity management, and Client Ordering Portal

## Architecture

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM (v5.22.0)
- **Auth**: JWT with refresh tokens, RBAC (Role-Based Access Control)
- **Port**: 3001
- **API Docs**: Swagger available at /api-docs

### Frontend (client/)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Routing**: React Router v7
- **Port**: 5000 (proxies /api to backend)

### Database Schema
Key entities:
- **Users** & **Roles**: Authentication and RBAC
- **Customers**: Hospital/clinic clients with license tracking
- **Products**: Radiopharmaceuticals with half-life, synthesis times
- **Orders**: Customer orders with activity requirements
- **Batches**: Production batches linked to orders
- **QCResults**: Quality control test results
- **BatchReleases**: QP (Qualified Person) release records
- **Shipments**: Delivery tracking
- **DoseUnit**: Individual dose dispensing from batches
- **DeliveryWindow**: Capacity windows for deliveries
- **Reservation**: Capacity reservations
- **Contract** & **ContractPriceItem**: Customer-specific pricing
- **Invoice**, **InvoiceItem**, **Payment**: Accounts receivable
- **AuditLogs**: GMP-compliant audit trail
- **Notifications** & **SystemConfig**: System settings

## Key Features

### 1. Radioactive Decay Calculations
- Formula: A(t) = A0 * exp(-λt) where λ = ln(2) / half_life
- Backward scheduling: Calculate production start time based on delivery time
- Activity overage calculations for decay compensation

### 2. Production Planning
- Automatic batch grouping by product and delivery window
- Equipment scheduling (cyclotrons, synthesis modules, hot cells)
- Conflict detection

### 3. Quality Control
- QC test templates per product
- Numeric and pass/fail test types
- Automatic batch status updates

### 4. QP Release
- Electronic signature with GMP compliance
- Full batch release workflow

### 5. Dose Dispensing
- Create dose units from released batches
- Patient reference tracking
- Label generation workflow
- Activity tracking and waste management
- Container type and volume tracking

### 6. Logistics
- Shipment creation and tracking
- Delivery confirmation with receiver signature
- On-time delivery reporting

### 7. Audit Trail
- All operations logged with user, timestamp, and changes
- Filterable by entity type, action, date range

### 8. Multi-Level Approval Workflows
- Configurable role-based approval chains for critical processes
- 5 default workflows: Order Approval, Batch Release, Shipment Dispatch, Customer Onboarding, Product Changes
- Email notifications via Resend for pending approvals, approvals, and rejections
- Approval inbox with filtering, expandable details, and action history
- ApprovalStatus component integrated into Orders and Batches pages

### 9. Availability & Capacity Management
- Delivery windows with minutes-based capacity tracking
- Weekly calendar view with utilization visualization
- Capacity generation for date ranges (exclude weekends option)
- Real-time utilization percentages

### 10. Reservations
- Reserve capacity in delivery windows
- Tentative and confirmed reservation statuses
- Convert reservations to orders
- Overbooking prevention

### 11. Contracts & Pricing
- Customer-specific contracts with payment terms
- Credit limits and contract discounts
- Per-product pricing with custom rates
- Contract lifecycle management (Draft, Active, Expired, Terminated)

### 12. Invoicing & Accounts Receivable
- Generate invoices from delivered orders
- Invoice line items with product details
- Payment tracking (Bank Transfer, Check, Credit Card, Cash)
- Financial summary dashboard (Total, Paid, Outstanding, Overdue)
- Invoice status workflow (Draft, Sent, Paid, Partially Paid, Overdue)

### 13. Client Ordering Portal
- Self-service portal for hospitals to place orders directly
- Separate customer-facing interface with teal color scheme
- Portal Dashboard with order statistics and quick actions
- Order History page with status tracking
- 3-step New Order wizard (product selection, delivery scheduling, review)
- Invoice viewing with payment history
- Automatic role-based routing (Customer role -> portal, others -> internal system)

## Demo Credentials
All accounts use password: **admin123**

| Role | Email | Permissions |
|------|-------|-------------|
| Admin | admin@radiopharma.com | Full system access |
| Sales | sales@radiopharma.com | Create/approve orders, manage customers, view reports |
| Production Planner | planner@radiopharma.com | Schedule batches, view reports |
| QC Analyst | qc@radiopharma.com | Enter QC results, view reports |
| Qualified Person | qp@radiopharma.com | Release batches, enter QC, view reports |
| Logistics | logistics@radiopharma.com | Dispatch shipments, view reports |
| Customer | customer@radiopharma.com | Create orders (portal access) |

## Running the Application

### Workflows
- **Backend Server**: `cd server && npx tsx src/index.ts`
- **Frontend**: `cd client && npx vite`

### Database Commands
```bash
# Generate Prisma client
cd server && npx prisma generate

# Push schema to database
cd server && npx prisma db push

# Seed demo data
cd server && npx tsx prisma/seed.ts
```

## API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET /api/auth/me

### Core Resources
- /api/customers - Customer management
- /api/products - Product catalog
- /api/orders - Order management
- /api/batches - Batch management
- /api/qc - Quality control
- /api/shipments - Logistics
- /api/planner - Production planning
- /api/reports - Analytics
- /api/audit - Audit logs
- /api/approvals - Multi-level approval workflows

### New Modules
- /api/dispensing - Dose unit management
- /api/availability - Delivery windows and capacity
- /api/reservations - Capacity reservations
- /api/contracts - Customer contracts and pricing
- /api/invoices - Invoicing and payments

## Products (Seeded)
1. FDG-18 (F-18, half-life: 109.8 min) - PET
2. NaF-18 (F-18, half-life: 109.8 min) - PET  
3. Tc-99m MDP (Tc-99m, half-life: 360 min) - SPECT
4. Tc-99m DTPA (Tc-99m, half-life: 360 min) - SPECT
5. I-131 Sodium Iodide (I-131, half-life: 11520 min) - Therapy
6. Lu-177 DOTATATE (Lu-177, half-life: 9500 min) - Therapy

## Recent Changes
- 2026-02-02: Client Ordering Portal
  - PortalLayout component with teal theme for customer-facing interface
  - PortalDashboard: Order stats, quick actions, recent orders/invoices
  - PortalOrders: Order history with status filtering
  - PortalNewOrder: 3-step wizard for placing orders
  - PortalInvoices: Invoice viewing with payment history
  - Role-based routing: Customer role auto-redirects to /portal
- 2026-02-02: Financial and Capacity Modules
  - Dose Dispensing: DoseUnit management with labeling, dispensing, and waste tracking
  - Availability Calendar: Minutes-based capacity with weekly view and utilization
  - Reservations: Capacity booking with tentative/confirmed statuses
  - Contracts & Pricing: Customer-specific rates, payment terms, credit limits
  - Invoicing & AR: Invoice generation, payment tracking, financial summaries
  - New frontend pages: Dispensing, Availability, Contracts, Invoices
  - Seed data: 22 delivery windows, 5 invoices, contracts with pricing
- 2026-01-21: Multi-level approval workflow system
  - WorkflowDefinition, WorkflowStep, ApprovalRequest, ApprovalAction database tables
  - Workflow service with role-based routing and email notifications via Resend
  - Approval triggers integrated into orders, batches, QC, shipments, customers
  - Frontend Approvals page with pending inbox, filtering, and action history
  - ApprovalStatus component for real-time visibility on entity pages
- 2026-01-20: Initial complete implementation
  - Full backend API with all routes
  - Complete React frontend with 13 pages
  - Database schema and seed data
  - Authentication and RBAC

## User Preferences
- No specific preferences recorded yet

## Notes
- Status state machines prevent invalid transitions for orders and batches
- All critical operations include audit logging
- Frontend uses responsive design with sidebar navigation (17 menu items)
- Navigation organized by workflow: Sales, Planning, Production, QC, Dispensing, Logistics, Finance
