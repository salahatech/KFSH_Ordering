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

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Prisma ORM**: Used for database interaction.
- **Resend**: For email notifications related to approval workflows.
- **PDFKit**: Server-side A4 PDF generation for invoices and receipts.
- **QRCode**: ZATCA-compliant QR code generation with TLV base64 encoding.