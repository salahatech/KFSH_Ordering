# RadioPharma OMS - Order Management System

## Overview
RadioPharma OMS is a comprehensive web application designed for managing radiopharmaceutical manufacturing operations. It covers the entire lifecycle from ordering and production planning to quality control, batch release, delivery, and dose dispensing. The system specializes in handling time-critical, decay-based products (PET and SPECT radiopharmaceuticals), ensuring GMP-style traceability, precise radioactive decay calculations, and backward scheduling based on delivery times and product half-lives. This project aims to streamline complex operations, enhance efficiency, and ensure regulatory compliance in radiopharmaceutical production.

## User Preferences
- No specific preferences recorded yet

## System Architecture

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens and Role-Based Access Control (RBAC)
- **API Documentation**: Swagger available at `/api-docs`

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Routing**: React Router v7
- **UI/UX**: Responsive design with a sidebar navigation, consistent modal design, and role-based routing for internal vs. client portal interfaces. The client portal features a distinct teal color scheme.
- **Theming**: Light/Dark/System mode support using CSS variables and Zustand store (`themeStore.ts`). Theme toggle in header. CSS variables defined in `index.css` with `[data-theme="light"]` and `[data-theme="dark"]` selectors.
- **Internationalization**: react-i18next with English/Arabic support, RTL layout for Arabic, language switcher in header.

### Core Architectural Decisions & Features
- **Radioactive Decay Calculations**: Implements `A(t) = A0 * exp(-λt)` for backward scheduling and activity overage compensation.
- **Production Planning**: Automated batch grouping, equipment scheduling, and conflict detection.
- **Quality Control**: Product-specific QC test templates, numeric and pass/fail test types, automatic batch status updates.
- **QP Release**: GMP-compliant electronic signature workflow.
- **Dose Dispensing**: Management of individual dose units, patient reference tracking, label generation, activity tracking, and waste management.
- **Logistics**: Shipment creation, tracking, delivery confirmation, and on-time delivery reporting, including driver management and a dedicated driver portal.
- **Audit Trail**: GMP-compliant logging of all operations with user, timestamp, and changes.
- **Multi-Level Approval Workflows**: Configurable role-based approval chains (Order, Batch Release, Shipment, Customer Onboarding, Product Changes, Invoice Approval) with email notifications and an approval inbox.
- **Availability & Capacity Management**: Delivery windows with minute-based capacity tracking, weekly calendar view, and real-time utilization visualization, including a reservation system.
- **Contracts & Pricing**: Customer-specific contracts, payment terms, credit limits, and per-product pricing.
- **Invoicing & Accounts Receivable**: Invoice generation from delivered orders, payment tracking, financial summaries, PDF generation with ZATCA-compliant QR codes, and a comprehensive payment submission and approval system.
- **Client Ordering Portal**: A self-service portal for customers to place orders, track history, view invoices, manage their profile (including delivery addresses with map picker and location photos), and manage contacts.
- **System Settings**: Configurable lookup tables for master data management including geographic data, product classifications, couriers, currencies, and Saudi National Address format support.
- **Security**: Status state machines to prevent invalid transitions, comprehensive audit logging, and customer-user linking enforcement for portal access.
- **Dashboards**: Comprehensive operational dashboards for various roles (Admin, QC, QP, Dispensing, Logistics, Customer Portal) featuring journey funnels, KPIs, work queues, exception panels, and activity timelines.
- **Customer Management**: Bilingual support, Saudi business identifiers, GPS coordinates, logo upload, document management, and enhanced search.
- **Batch Management**: Extended batch statuses with full state machine, audit trail, role-based transition enforcement, and visual journey tracking.
- **Order Journey Tracking**: Visual stepper, timeline, and "What happens next" panel with role-based actions.
- **Attachment System**: File attachments for all major entities (Orders, Batches, Shipments, Invoices, Contracts, Products) with admin-configurable file types, 5MB limit, server-side validation, dangerous file blocking, authenticated downloads, and GMP-compliant audit logging for all attachment operations.
- **Notification Center**: Centralized notification management page with pagination, filtering by read/unread status and notification type, click-to-navigate to related records (Orders, Batches, Shipments, etc.), and bulk mark-as-read functionality.
- **Role Management**: Admin page to view, create, and edit user roles with permission assignment, supporting full RBAC configuration.
- **E-Signature Framework**: GMP-compliant electronic signatures with 8 scopes (BATCH_RELEASE, QC_APPROVAL, DEVIATION_APPROVAL, MASTERDATA_CHANGE, RECIPE_ACTIVATION, PO_APPROVAL, FINANCIAL_APPROVAL, DISPENSING_APPROVAL), server-side meaning validation, and immutability enforcement with audit logging.
- **Master Data Management - Recipes/BOM**: Material master data (12 categories), Recipe versioning (DRAFT → PENDING_APPROVAL → ACTIVE → SUPERSEDED), BOM components with quantities/tolerances, process steps with quality checkpoints, and e-signature activation workflow.
- **Procurement - Supplier & PO Management**: Supplier master data with contacts and documents, bilingual support (English/Arabic), Saudi business identifiers (Tax/VAT/CR numbers), Purchase Order workflow (DRAFT → PENDING_APPROVAL → APPROVED → SENT → ACKNOWLEDGED → PARTIALLY_RECEIVED → RECEIVED → CLOSED/CANCELLED), e-signature approval using PO_APPROVAL scope, line item management with automatic VAT calculation (15%), and comprehensive audit logging for all state transitions.
- **Inventory/Warehouse Control**: Warehouse master data with location hierarchy (zone/aisle/rack/shelf/bin), 7 warehouse types (RAW_MATERIALS, QUARANTINE, PRODUCTION, FINISHED_GOODS, COLD_STORAGE, RADIOACTIVE, WASTE), Goods Receiving Notes (GRN) with QC workflow (DRAFT → PENDING_QC → APPROVED/PARTIALLY_APPROVED/REJECTED), automatic stock posting from approved GRN, stock tracking with movements (RECEIPT, ISSUE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, RETURN, SCRAP), stock status management (AVAILABLE, QUARANTINE, RESERVED, ON_HOLD, EXPIRED, REJECTED), temperature/humidity tracking for cold storage, radioactive material handling, and comprehensive movement audit trail.
- **Manufacturing Execution (eBR)**: Electronic Batch Records with full production lifecycle (DRAFT → IN_PROGRESS → PENDING_REVIEW → APPROVED), step-by-step execution tracking with 6 statuses (PENDING, IN_PROGRESS, COMPLETED, SKIPPED, FAILED, ON_HOLD), recipe-driven step generation with quality checkpoints, material consumption with real-time inventory integration (PRODUCTION_ISSUE/PRODUCTION_RECEIPT movements), equipment usage tracking with start/end times and parameters, deviation management with CAPA workflow (OPEN → UNDER_INVESTIGATION → CAPA_PROPOSED → CAPA_APPROVED → IMPLEMENTING → CLOSED), severity classification (MINOR, MAJOR, CRITICAL), 8 deviation types (PROCESS, EQUIPMENT, MATERIAL, ENVIRONMENTAL, DOCUMENTATION, PERSONNEL, CONTAMINATION, OTHER), e-signature integration for step verification, batch record review and approval, real-time KPI dashboard showing progress, timing variance, material consumption, equipment usage, and deviation counts.
- **OOS/OOT Investigations**: Comprehensive out-of-specification and out-of-trend investigation management with 3 case types (OOS, OOT, OOE), 11-phase workflow (OPEN → PHASE_1_LAB_INVESTIGATION → PHASE_1_COMPLETE → PHASE_2_FULL_INVESTIGATION → PHASE_2_COMPLETE → CAPA_PROPOSED → CAPA_APPROVED → CAPA_IMPLEMENTING → CLOSED_CONFIRMED/CLOSED_INVALIDATED/CLOSED_INCONCLUSIVE), 4 priority levels (LOW, MEDIUM, HIGH, CRITICAL), test specification tracking with deviation percentage calculation, Phase 1 lab investigation with retesting capability, Phase 2 full root cause analysis with impact assessment and affected batches tracking, CAPA workflow with corrective and preventive actions, e-signature integration for CAPA approval and case closure, timeline tracking for all status transitions, attachment support per investigation phase, and KPI dashboard with case statistics.
- **Multi-Channel Notification Settings**: Configurable notification channels (Email via Resend, SMS via Twilio, WhatsApp via Twilio) with per-event-type channel configuration, connection status monitoring, test message functionality, admin-only settings page accessible from System Settings, per-category channel routing (Orders, Batches, Deliveries, Approvals, Invoices), and audit-logged configuration changes. Enhanced channel management at `/admin/notification-channels` with enable/disable toggles per channel, test message functionality, delivery attempt logging at `/admin/notification-delivery-logs` with filtering and CSV export, and user notification preferences at `/me/notification-preferences` with per-channel toggles and severity threshold configuration. Credentials securely managed via Replit integrations (Resend for email, Twilio for SMS/WhatsApp).
- **Standardized Entity Detail Pages**: Consistent detail page layout across major entities (Materials, Suppliers, Purchase Orders, Warehouses, Goods Receiving Notes) using reusable EntityDetailLayout component with sticky header (title/code/status/actions), KPI cards row, tabbed interface (Overview, related data, Documents, Timeline), LinkedRecordsSidebar for entity navigation, and audit-derived timeline sections.
- **Enterprise Reporting Center**: Centralized reporting module at `/enterprise-reports` with 13 report categories (Inventory & Warehouse, Production & Batches, Orders & Reservations, Quality & QP Release, Dispensing, Logistics & Deliveries, Finance & Invoicing, Customers & Contracts, Products & Pricing, Planner & Capacity, Payments & Approvals, Users & Security, Audit & Compliance), 20+ pre-built reports with configurable filters, pagination, sorting, drill-down navigation to source records, Excel export with ExcelJS (proper headers, formatted columns), PDF export with PDFKit (A4 with headers/footers/pagination), role-based access control per report, and left sidebar navigation with expandable categories.
- **Internationalization System**: Comprehensive admin-managed localization with Language model (code, name, nativeName, direction, isActive, isDefault), TranslationEntry for entity-level translations (Product/Customer/Material etc.), SystemLocalization for global defaults, Exchange Rate management (MANUAL/API sources, SAR base currency), and UserPreference for per-user language/timezone/currency overrides. Admin pages at `/admin/languages`, `/admin/exchange-rates`, `/admin/localization`, `/admin/translations` with inline editing and JSON import/export. `useLocalization` hook provides formatMoney, formatDateTime, formatDateOnly, formatTimeOnly, formatNumber, formatPercent utilities with timezone-aware formatting (date-fns-tz) and currency conversion helpers.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Prisma ORM**: Used for database interaction.
- **Resend**: For email notifications (transactional emails, approval workflows, system alerts).
- **Twilio**: For SMS and WhatsApp notifications (delivery updates, urgent alerts).
- **PDFKit**: Server-side A4 PDF generation for invoices and receipts.
- **QRCode**: ZATCA-compliant QR code generation with TLV base64 encoding.