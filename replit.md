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

### Core Architectural Decisions & Features
- **Radioactive Decay Calculations**: Implements `A(t) = A0 * exp(-λt)` for backward scheduling and activity overage compensation.
- **Production Planning**: Automated batch grouping, equipment scheduling, and conflict detection.
- **Quality Control**: Product-specific QC test templates, numeric and pass/fail test types, automatic batch status updates.
- **QP Release**: GMP-compliant electronic signature workflow.
- **Dose Dispensing**: Management of individual dose units, patient reference tracking, label generation, activity tracking, and waste management.
- **Logistics**: Shipment creation, tracking, delivery confirmation, and on-time delivery reporting.
- **Audit Trail**: GMP-compliant logging of all operations with user, timestamp, and changes.
- **Multi-Level Approval Workflows**: Configurable role-based approval chains (Order, Batch Release, Shipment, Customer Onboarding, Product Changes) with email notifications and an approval inbox.
- **Availability & Capacity Management**: Delivery windows with minute-based capacity tracking, weekly calendar view, and real-time utilization visualization.
- **Reservations**: Capacity reservation system with tentative/confirmed statuses and overbooking prevention.
- **Contracts & Pricing**: Customer-specific contracts, payment terms, credit limits, and per-product pricing.
- **Invoicing & Accounts Receivable**: Invoice generation from delivered orders, payment tracking, financial summaries, and PDF generation with ZATCA-compliant QR codes.
- **Client Ordering Portal**: A self-service portal for customers to place orders, track history, and view invoices, featuring a separate UI/UX.
- **System Settings**: Configurable lookup tables for master data management including geographic data (Country -> Region -> City hierarchy), product classifications, couriers, currencies (SAR default with exchange rates), and Saudi National Address format support for customers.
- **Security**: Status state machines to prevent invalid transitions, comprehensive audit logging for critical operations.

## Recent Changes (2026-02-02)
- **Customer Payment Workflow**: Complete payment submission and approval system:
  - Portal customers can submit payments with proof uploads (PNG/JPG/PDF up to 10MB)
  - Support for full and partial payments with overpayment validation
  - Payment methods: Bank Transfer, Credit Card, Cash, Cheque
  - Payment request status tracking (Pending, Confirmed, Rejected)
  - Finance/Admin approval queue at `/payments` with confirm/reject actions
  - Automatic receipt voucher generation on payment confirmation
  - Invoice status auto-update (SENT → PARTIALLY_PAID → PAID)
- **PDF Invoice with ZATCA QR Code**: Server-side A4 PDF generation at `/api/invoice-pdf/:id`
  - Professional layout with company branding, customer details, line items
  - ZATCA-compliant QR code using TLV base64 encoding (Tags 1-5)
  - Payment history and balance due sections
  - Saudi timezone support (UTC+3) for timestamps
  - Role-based access control (customer ownership or staff permission)
- **Portal Invoice Management**: Enhanced at `/portal/invoices`
  - Invoice list with filtering by status
  - KPI cards showing total billed, paid, outstanding, overdue counts
  - Invoice detail panel with VAT breakdown and payment history
  - Download PDF button with ZATCA QR code
  - Submit Payment button with proof upload modal
  - Payment request history with status badges
- **Customer Self-Service Profile**: Portal customers can now edit their own profile at `/portal/profile`:
  - Company name (English/Arabic), email, mobile, phone
  - Delivery address with country/region/city dropdowns and GPS coordinates
  - **Interactive Map Picker**: Click-to-select GPS location using Leaflet/OpenStreetMap
  - **Location Photos**: Upload photos of delivery location with captions to help drivers
  - Delivery window preferences (start/end times, preferred time)
  - Contact persons management (add/edit/remove)
  - Logo upload with preview
- **Enhanced Customer Module**: Comprehensive customer management with:
  - Bilingual support (nameEn/nameAr) for i18n readiness
  - Saudi business identifiers (CR Number, Tax Number)
  - GPS coordinates (latitude/longitude) for delivery optimization
  - Customer logo upload with image preview
  - Document management system (CR, Tax Certificate, License, Contract, NDA)
  - Saudi National Address format with full address field
  - Mobile number validation supporting Saudi format (+9665xxxxxxxx)
  - Enhanced search across name, code, mobile, email, CR, tax number
  - Dedicated create/edit pages with sectioned layout and validations
- **Dashboard Command Center**: Complete operations dashboard overhaul with:
  - End-to-end journey funnel stepper showing order flow from Submitted → Delivered
  - KPI cards with deep-link routing to filtered pages
  - Work queues (Validation, QC, QP Release, Logistics) with clickable items
  - Exceptions & Alerts panel for QC failures, delays, and on-hold items
  - Capacity utilization widget showing 7-day capacity overview
  - Recent activity timeline with status change events
- **Department Dashboards**: Role-specific views at `/dashboard/qc`, `/dashboard/qp`, `/dashboard/dispensing`, `/dashboard/logistics`
- **Customer Portal Dashboard**: Enhanced with journey funnel, arriving today queue, in-transit tracking
- **Reusable Dashboard Components**: DashboardHeader, JourneyFunnelStepper, QueueList, ExceptionPanel, RecentActivityTimeline, CapacityWidget
- **Backend Dashboard API**: Aggregated endpoints at `/dashboard/overview`, `/dashboard/qc`, `/dashboard/qp`, `/dashboard/dispensing`, `/dashboard/logistics`, `/dashboard/portal`
- **Enhanced Batch Management**: Extended to 19 batch statuses with full state machine, BatchEvent audit trail, role-based transition enforcement, KPI cards, filter widgets, and Batch Journey page with visual stepper/timeline
- **Order Journey Tracking**: Visual stepper, timeline, "What happens next" panel with role-based actions

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Prisma ORM**: Used for database interaction.
- **Resend**: For email notifications related to approval workflows.
- **PDFKit**: Server-side A4 PDF generation for invoices and receipts.
- **QRCode**: ZATCA-compliant QR code generation with TLV base64 encoding.