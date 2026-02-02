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
- **Enhanced Batch Management**: Extended to 19 batch statuses with full state machine, BatchEvent audit trail, role-based transition enforcement, KPI cards, filter widgets, and Batch Journey page with visual stepper/timeline
- **Order Journey Tracking**: Visual stepper, timeline, "What happens next" panel with role-based actions

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Prisma ORM**: Used for database interaction.
- **Resend**: For email notifications related to approval workflows.
- **jsPDF library**: For generating PDF invoices.