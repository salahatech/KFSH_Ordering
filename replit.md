# RadioPharma OMS - Order Management System

## Overview
RadioPharma OMS is a comprehensive web application for managing radiopharmaceutical manufacturing, covering the entire lifecycle from ordering and production to quality control, batch release, delivery, and dose dispensing. It specializes in time-critical, decay-based products (PET and SPECT radiopharmaceuticals), ensuring GMP-style traceability, precise radioactive decay calculations, and backward scheduling based on delivery times and product half-lives. The system aims to streamline complex operations, enhance efficiency, and ensure regulatory compliance in radiopharmaceutical production.

## User Preferences
- No specific preferences recorded yet

## System Architecture

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens and Role-Based Access Control (RBAC)
- **API Documentation**: Swagger

### Frontend
- **Framework**: React 19 with TypeScript, Vite
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Routing**: React Router v7
- **UI/UX**: Responsive design, consistent modal designs, sidebar navigation. Client portal uses a distinct teal color scheme.
- **Theming**: Light/Dark/System mode support via CSS variables.
- **Internationalization**: react-i18next with English/Arabic support, RTL layout for Arabic.

### Core Architectural Decisions & Features
- **Radiopharmaceutical Specifics**: Radioactive decay calculations, backward scheduling, dose dispensing, and waste management.
- **Production Management**: Automated batch grouping, equipment scheduling, electronic Batch Records (eBR) with step-by-step execution, material consumption, and deviation management.
- **Quality Control**: Product-specific QC test templates, automatic batch status updates, and comprehensive QC Batch Testing system with auto-evaluation.
- **Regulatory Compliance**: GMP-compliant electronic signature workflows (QP Release, approval workflows), audit trails, and OOS/OOT investigations.
- **Order & Logistics**: Multi-level approval workflows, availability & capacity management, client ordering portal, shipment tracking, and driver management.
- **Financials**: Contracts & pricing, invoice generation with ZATCA-compliant QR codes, payment tracking, and a payment submission/approval system.
- **Data Management**: Master data management for recipes/BOM, materials, suppliers, and system settings.
- **Inventory & Warehouse**: Warehouse control with location hierarchy, Goods Receiving Notes (GRN), stock tracking with movements, and radioactive material handling.
- **User Interaction**: Dashboards for various roles, notification center (multi-channel), global announcement system, and standardized entity detail pages.
- **Security**: Status state machines, comprehensive audit logging, and role management with permission assignment.
- **Reporting**: Centralized Enterprise Reporting Center with various categories, filters, and export options (Excel, PDF).
- **Localization**: Admin-managed internationalization with language support, translation entries, exchange rate management, and user-specific language/timezone/currency overrides.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Prisma ORM**: Database interaction.
- **Resend**: Email notifications.
- **Twilio**: SMS and WhatsApp notifications.
- **PDFKit**: Server-side A4 PDF generation.
- **QRCode**: ZATCA-compliant QR code generation.