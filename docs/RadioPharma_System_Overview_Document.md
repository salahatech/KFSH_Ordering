# RadioPharma Ordering, Manufacturing & Delivery System
## System Overview & End-to-End Business Process Document

---

**Document Version:** 1.0  
**Date:** February 2026  
**Classification:** Client Reference Document

---

## Table of Contents

1. Document Purpose
2. System Overview
3. System Architecture (Business View)
4. User Roles & Responsibilities
5. System Modules & Pages
6. Order Management Workflow
7. Manufacturing & Batch Execution
8. Quality Control (QC)
9. QP Release
10. Dispensing
11. Logistics & Delivery
12. Finance & Invoicing
13. Notifications & Announcements
14. Reports & Audit
15. End-to-End Example Scenario
16. Compliance & Control Summary
17. Conclusion

---

## 1. Document Purpose

### 1.1 Why This Document Exists

This document serves as the official comprehensive reference for the RadioPharma Order Management System (OMS). It provides a complete understanding of the system's capabilities, workflows, and business processes from order creation through to final payment collection.

### 1.2 What the System Covers

The RadioPharma OMS is an integrated platform that manages the complete lifecycle of radiopharmaceutical products, including:

- Customer order management and approval workflows
- Production planning and batch manufacturing
- Quality control testing and release processes
- Logistics coordination and delivery tracking
- Financial management, invoicing, and payment processing
- Regulatory compliance and audit trail maintenance

### 1.3 Intended Audience

This document is designed for:

| Audience | Focus Areas |
|----------|-------------|
| Executive Management | System overview, compliance, business value |
| Operations Team | Order processing, production workflows, logistics |
| Quality Assurance | QC testing, QP release, compliance controls |
| Finance Department | Invoicing, payments, ZATCA compliance |
| IT Department | System architecture, integration points |
| Customer Service | Customer portal, order tracking, support |

---

## 2. System Overview

### 2.1 High-Level Description

The RadioPharma Order Management System is a comprehensive web-based platform specifically designed for radiopharmaceutical manufacturing operations. The system addresses the unique challenges of managing time-sensitive, decay-based products while ensuring full regulatory compliance and operational efficiency.

### 2.2 End-to-End Lifecycle Coverage

The system provides complete visibility and control across the entire product lifecycle:

```
Order → Planning → Production → QC Testing → QP Release → Dispensing → Delivery → Invoice → Payment
```

Each stage is interconnected with automated workflows, status tracking, and comprehensive audit trails.

### 2.3 Key Objectives

| Objective | Description |
|-----------|-------------|
| **Compliance** | Full GMP compliance with electronic signatures, separation of duties, and complete traceability |
| **Traceability** | End-to-end tracking from raw materials through to patient delivery |
| **Efficiency** | Automated workflows, intelligent scheduling, and streamlined operations |
| **Transparency** | Real-time visibility for all stakeholders including customers |
| **Accuracy** | Radioactive decay calculations, backward scheduling, and precise dosing |

---

## 3. System Architecture (Business View)

### 3.1 Platform Overview

The RadioPharma OMS is a modern, web-based platform accessible from any device with an internet connection. No software installation is required on user devices.

### 3.2 Portal Structure

The system comprises three distinct access portals:

| Portal | Users | Purpose |
|--------|-------|---------|
| **Internal Portal** | Staff members | Full operational access based on role |
| **Customer Portal** | Hospital/Clinic users | Order placement, tracking, document access |
| **Driver Portal** | Delivery personnel | Route management, proof of delivery |

### 3.3 Integration Layer

The system integrates with external services for:

- **Email Notifications** - Automated alerts and communications
- **SMS Messaging** - Critical notifications and reminders
- **WhatsApp** - Customer communication channel
- **ZATCA** - Saudi tax authority compliance for e-invoicing

[Screenshot Placeholder: System Architecture Diagram]

---

## 4. User Roles & Responsibilities

The system implements role-based access control (RBAC) to ensure users only access functions relevant to their responsibilities.

| Role | Primary Responsibilities |
|------|-------------------------|
| **Admin** | System configuration, user management, master data maintenance, full system access |
| **Customer** | Place orders, track deliveries, view invoices, access customer portal |
| **Order Desk** | Receive and validate orders, coordinate with customers, manage order queue |
| **Planner** | Production scheduling, capacity planning, batch grouping, resource allocation |
| **Production** | Execute batch records, record manufacturing steps, material consumption |
| **QC Analyst** | Perform quality tests, record results, attach certificates, flag deviations |
| **QP (Qualified Person)** | Review batch records, approve/reject releases, electronic signature authority |
| **Logistics** | Shipment creation, driver assignment, delivery coordination, route planning |
| **Driver** | View assigned deliveries, navigate to customers, capture proof of delivery |
| **Finance** | Invoice management, payment processing, ZATCA compliance, financial reporting |

### 4.1 Separation of Duties

The system enforces critical separation of duties:
- Production staff cannot release their own batches
- QC analysts cannot approve products they tested
- QP release requires independent verification
- Payment approvals require separate authorization

---

## 5. System Modules & Pages

### 5.1 Master Data Management

Master data forms the foundation of all system operations. Proper configuration ensures accurate processing throughout the system.

#### Products

The product master defines all sellable radiopharmaceutical products with their production and quality specifications.

Key Information:
- Product code and name (Arabic/English)
- Radioisotope type and half-life
- Standard activity levels
- Pricing information
- Associated recipe/BOM
- QC test template assignment

[Screenshot Placeholder: Product Master Screenshot]

#### Materials

Complete inventory of all raw materials, components, and consumables used in production.

Key Information:
- Material code and description
- Category and classification
- Stock levels and locations
- Supplier information
- Radioactive handling requirements

#### Recipes & Bill of Materials (BOM)

Defines the manufacturing formula for each product, including:
- Required materials and quantities
- Equipment requirements
- Process parameters
- Yield expectations

#### Customers

Comprehensive customer database with:
- Customer name (Arabic and English)
- Contact information
- Delivery addresses with GPS coordinates
- Contract and pricing agreements
- Credit terms
- Required documents

[Screenshot Placeholder: Customer Edit Page Screenshot]

#### Suppliers

Supplier information for procurement:
- Company details
- Contact persons
- Product/material offerings
- Qualification status
- Payment terms

#### Warehouses

Location management including:
- Warehouse identification
- Location hierarchy (zones, racks, bins)
- Storage conditions
- Radioactive material handling areas

### 5.2 Product Management

Each product is configured with:

**Selling Definition:**
- Available package sizes
- Minimum order quantities
- Lead time requirements
- Geographic availability

**Production Definition:**
- Associated recipe
- Equipment requirements
- Capacity constraints
- Production scheduling rules

**QC Template:**
- Required tests per product
- Acceptance criteria
- Testing sequence
- Certificate requirements

[Screenshot Placeholder: Product Details Screenshot]

### 5.3 Customer Management

Customer records maintain complete information for order processing and delivery:

| Field Category | Information Captured |
|----------------|---------------------|
| Identity | Customer code, legal name, trade name |
| Localization | Arabic name, English name |
| Contact | Phone, email, contact persons |
| Address | Full address, GPS coordinates, delivery instructions |
| Commercial | Contract terms, credit limit, pricing tier |
| Documents | Licenses, certificates, agreements |

[Screenshot Placeholder: Customer Edit Page Screenshot]

---

## 6. Order Management Workflow

### 6.1 Order Creation

Orders can be created through two channels:

**Customer Portal:**
1. Customer logs into portal
2. Selects product and quantity
3. Chooses delivery date/time
4. Submits order request

**Internal Order Desk:**
1. Receives order via phone/email
2. Creates order on behalf of customer
3. Validates product availability
4. Confirms delivery requirements

### 6.2 Order Validation

The system automatically validates:
- Product availability
- Customer credit status
- Delivery time feasibility
- Minimum order requirements
- Capacity constraints

### 6.3 Approval Workflow

Orders progress through defined approval stages:

```
Draft → Submitted → Approved → In Production → Ready → Delivered → Completed
```

Multi-level approvals may be required based on:
- Order value thresholds
- Customer type
- Special requirements
- Rush order requests

### 6.4 Status Progression

| Status | Description |
|--------|-------------|
| Draft | Order created but not submitted |
| Submitted | Awaiting initial review |
| Pending Approval | Requires management approval |
| Approved | Cleared for production planning |
| Planned | Assigned to production schedule |
| In Production | Batch manufacturing in progress |
| QC Testing | Quality control in progress |
| Released | QP approved for delivery |
| Ready for Dispatch | Prepared for shipment |
| In Transit | En route to customer |
| Delivered | Proof of delivery captured |
| Completed | Invoiced and closed |

[Screenshot Placeholder: Order Journey Screenshot]

---

## 7. Manufacturing & Batch Execution

### 7.1 Batch Creation

Batches are created from approved orders with:
- Automatic batch number generation
- Recipe assignment
- Material reservation
- Equipment scheduling
- Target activity calculations

### 7.2 Recipe Usage

The system uses the assigned recipe to:
- Generate the Electronic Batch Record (eBR)
- Calculate material requirements
- Define process steps
- Set critical parameters

### 7.3 Electronic Batch Record (eBR)

The eBR is the digital equivalent of a paper batch record, providing:

**Step-by-Step Execution:**
- Ordered process steps
- Required materials per step
- Equipment specifications
- Parameter entry fields
- Electronic signatures

**Real-Time Recording:**
- Actual times and values
- Operator identification
- Deviation flagging
- Material lot tracking

**Automatic Calculations:**
- Decay corrections
- Yield calculations
- Activity adjustments
- Time-based scheduling

### 7.4 Material Consumption Tracking

Each material used is recorded with:
- Material lot number
- Quantity consumed
- Stock location drawn from
- Expiry verification
- Radioactivity measurements

[Screenshot Placeholder: Batch Execution Screenshot]

---

## 8. Quality Control (QC)

### 8.1 QC Test Definitions

System administrators define the library of available QC tests in settings:

| Test Attribute | Description |
|----------------|-------------|
| Test Code | Unique identifier |
| Test Name | Descriptive name |
| Category | Grouping (Chemical, Physical, Microbiological, etc.) |
| Method | Testing procedure reference |
| Unit of Measure | Result units |
| Acceptance Criteria | Pass/fail specifications |

### 8.2 Product-Based QC Templates

Each product has an assigned QC template defining:
- Which tests are required
- Testing sequence
- Mandatory vs. optional tests
- Documentation requirements

### 8.3 Batch QC Testing

When a batch enters QC, analysts complete testing using the structured interface:

| Test | Criteria | Result | Status |
|------|----------|--------|--------|
| Appearance | Clear, colorless solution | Clear, colorless | PASS |
| pH | 4.5 - 7.5 | 5.8 | PASS |
| Radionuclidic Purity | ≥ 99.0% | 99.7% | PASS |
| Radiochemical Purity | ≥ 95.0% | 98.2% | PASS |
| Bacterial Endotoxins | < 175 EU/V | 42 EU/V | PASS |
| Sterility | No growth | No growth | PASS |

### 8.4 Auto Pass/Fail Logic

The system automatically evaluates results against criteria:
- Numerical ranges: Checks if result falls within limits
- Text comparisons: Validates expected values
- Boolean checks: Confirms pass/fail conditions

### 8.5 Attachments & Audit

All QC activities include:
- Certificate attachments
- Chromatogram images
- Equipment calibration records
- Complete audit trail of entries and changes

[Screenshot Placeholder: QC Batch Testing Screenshot]

---

## 9. QP Release

### 9.1 Qualified Person Responsibilities

The Qualified Person (QP) holds ultimate responsibility for batch release decisions. The system supports this critical role by providing:

- Complete batch history review
- QC test results summary
- Deviation reports
- Material traceability
- Equipment usage records

### 9.2 Electronic Signature

Release decisions require electronic signature with:
- User authentication
- Signature meaning declaration
- Timestamp recording
- Audit trail entry

### 9.3 Separation of Duties

The system enforces that:
- QP cannot release batches they manufactured
- QP must be independent from QC testing
- Multiple approvals may be required for critical decisions

### 9.4 Release Decision

The QP can:
- **Approve Release** - Batch cleared for dispensing and delivery
- **Reject Batch** - Batch fails quality requirements
- **Request Investigation** - Additional review needed
- **Conditional Release** - Limited approval with restrictions

[Screenshot Placeholder: QP Release Screenshot]

---

## 10. Dispensing

### 10.1 Dose Unit Creation

After QP release, the batch is dispensed into individual dose units:

- Each dose receives a unique identifier
- Activity levels are calculated with decay correction
- Patient/order assignment is recorded
- Packaging specifications are applied

### 10.2 Label Printing

The system generates compliant labels including:
- Product name
- Batch number
- Dose activity and reference time
- Expiry date/time
- Customer information
- Barcode/QR code for scanning

### 10.3 Link to Shipment

Dispensed units are grouped for delivery:
- Assignment to specific shipments
- Temperature monitoring requirements
- Handling instructions
- Delivery sequence optimization

[Screenshot Placeholder: Dispensing Screenshot]

---

## 11. Logistics & Delivery

### 11.1 Shipment Creation

Logistics coordinators create shipments by:
- Selecting ready orders/doses
- Grouping by route or customer
- Assigning delivery windows
- Specifying handling requirements

### 11.2 Driver Assignment

Drivers are assigned based on:
- Vehicle availability
- Route familiarity
- Certification status
- Workload balancing

### 11.3 Driver Portal Flow

Drivers access their mobile portal to:

1. **View Assignments** - See day's deliveries with priority order
2. **Navigation** - GPS directions to each delivery location
3. **Customer Contact** - One-touch calling capability
4. **Status Updates** - Mark arrival, delivery progress
5. **Proof of Delivery** - Capture completion evidence

### 11.4 Proof of Delivery

The system captures comprehensive delivery evidence:

| Evidence Type | Description |
|---------------|-------------|
| Digital Signature | Recipient signature on device |
| Photo | Image of delivered goods |
| GPS Location | Automatic location capture |
| Timestamp | Exact delivery time |
| Recipient Name | Confirmed receiver identity |
| Notes | Delivery observations |

[Screenshot Placeholder: Driver Delivery Screenshot]

---

## 12. Finance & Invoicing

### 12.1 Invoice Generation Timing

Invoices are generated automatically when:
- Proof of delivery is captured
- All order items are delivered
- System validates delivery completion

Manual invoice creation is available for:
- Partial deliveries
- Special billing arrangements
- Adjustments and corrections

### 12.2 Approval Workflow

High-value invoices may require approval:

```
Draft → Pending Approval → Approved → Sent → Paid → Closed
```

### 12.3 Currency Management

**Default Currency: SAR (Saudi Riyal)**

All financial transactions are recorded in SAR as the base currency. The system supports:
- Display in alternative currencies for convenience
- Exchange rate management for reporting
- Automatic conversion calculations
- SAR remains mandatory for official records

### 12.4 ZATCA Integration

The system is fully compliant with Saudi Arabian tax authority requirements:

- **E-Invoice Generation** - Structured invoice data
- **QR Code** - ZATCA-compliant QR codes on all invoices
- **Digital Signing** - Cryptographic invoice signing
- **Submission** - Automated reporting to ZATCA
- **Archive** - Compliant document retention

### 12.5 Payment Processing

**Partial Payments:**
- Record installment payments
- Track outstanding balances
- Automatic allocation to invoices

**Full Payments:**
- Single payment closure
- Multiple payment methods
- Bank reconciliation support

### 12.6 Receipt Vouchers

Each payment generates an official receipt with:
- Unique voucher number
- Payment details
- Invoice references
- Authorized signatures

[Screenshot Placeholder: Invoice & Receipt Screenshot]

---

## 13. Notifications & Announcements

### 13.1 In-App Notifications

Users receive real-time notifications for:
- Order status changes
- Approval requests
- Task assignments
- System alerts
- Deadline reminders

### 13.2 External Channels

Notifications are delivered through multiple channels:

| Channel | Use Cases |
|---------|-----------|
| Email | Order confirmations, invoices, reports |
| SMS | Critical alerts, delivery notifications |
| WhatsApp | Customer communications, delivery updates |

### 13.3 Announcement Bar

System-wide announcements appear as a banner for:
- Scheduled maintenance notifications
- Policy updates
- Important reminders
- Emergency communications

### 13.4 Scheduled Announcements

Administrators can schedule announcements for:
- Future display start times
- Automatic expiration
- Targeted user groups
- Priority levels

[Screenshot Placeholder: Announcement Bar Screenshot]

---

## 14. Reports & Audit

### 14.1 Report Categories

The system provides comprehensive reporting across all modules:

| Category | Report Types |
|----------|--------------|
| Orders | Order summary, status, aging, customer activity |
| Production | Batch records, yields, material usage, efficiency |
| Quality | Test results, deviations, release statistics |
| Logistics | Delivery performance, driver activity, route analysis |
| Finance | Revenue, aging, payment collection, ZATCA compliance |
| Inventory | Stock levels, movements, expiry tracking |

### 14.2 Export Capabilities

All reports support export to:
- **Excel** - For data analysis and manipulation
- **PDF** - For official documentation and archiving

### 14.3 Audit Trail

Every system action is recorded with:
- User identification
- Timestamp
- Action performed
- Before/after values
- IP address
- Session information

Audit records are:
- Tamper-proof
- Searchable
- Exportable
- Retained per policy

[Screenshot Placeholder: Reports Dashboard Screenshot]

---

## 15. End-to-End Example Scenario

### FDG Order - From Customer Order to Final Payment

This example follows a complete order lifecycle for FDG-18 (Fluorodeoxyglucose), a common PET radiopharmaceutical.

---

**Step 1: Order Created**

King Faisal Specialist Hospital logs into the Customer Portal and places an order:
- Product: FDG-18 (10 mCi x 5 doses)
- Delivery Date: Tomorrow, 7:00 AM
- Special Instructions: Cold storage required

*System validates availability and customer credit status.*

---

**Step 2: Order Approved**

Order Desk reviews and approves the order:
- Confirms delivery time is achievable
- Verifies pricing per contract
- Approves for production planning

---

**Step 3: Batch Scheduled**

Planner assigns the order to production:
- Groups with other FDG orders for efficiency
- Schedules cyclotron run for 4:00 AM
- Allocates synthesis equipment
- Reserves QC lab time

---

**Step 4: Batch Produced**

Production team executes the Electronic Batch Record:
- Starts cyclotron bombardment at 4:00 AM
- Performs automated synthesis at 5:30 AM
- Records all parameters and materials
- Completes production at 6:00 AM

---

**Step 5: QC Tested**

QC Analyst performs required tests:

| Test | Result | Status |
|------|--------|--------|
| Appearance | Clear, colorless | PASS |
| pH | 5.6 | PASS |
| Radiochemical Purity | 98.5% | PASS |
| Radionuclidic Purity | 99.8% | PASS |
| Endotoxins | 28 EU/V | PASS |

---

**Step 6: QP Released**

Qualified Person reviews:
- Batch record completeness
- QC test results
- Deviation history
- Materials used

QP approves release with electronic signature at 6:15 AM.

---

**Step 7: Dispensed**

Doses are prepared:
- 5 individual vials dispensed
- Activity verified: 10 mCi each (calibrated to 7:00 AM)
- Labels printed with patient identifiers
- Packaged in validated shipping containers

---

**Step 8: Shipped**

Logistics creates shipment:
- Driver Ahmed assigned
- Route optimized for 7:00 AM delivery
- Cold chain monitored
- Customer notified of departure

---

**Step 9: Delivered**

Driver arrives at hospital:
- Captures electronic signature from Nuclear Medicine department
- Photographs delivered package
- GPS confirms location
- System records delivery at 6:55 AM

---

**Step 10: Invoiced**

System generates invoice automatically:
- Invoice #INV-2026-00542
- Amount: SAR 7,500.00
- ZATCA QR code generated
- Sent to customer via email

---

**Step 11: Payment Received**

Finance records payment:
- Bank transfer received
- Payment allocated to invoice
- Receipt voucher generated
- Customer account updated

---

**Step 12: Order Completed**

Order status changes to Completed:
- All documentation archived
- Audit trail finalized
- Ready for regulatory inspection

[Screenshot Placeholder: E2E Screenshots Sequence]

---

## 16. Compliance & Control Summary

### 16.1 Traceability

The system provides complete traceability:

| From | To |
|------|----|
| Raw material lots | Final dose administered |
| Supplier certificates | Product release |
| Equipment used | Batch produced |
| Operator actions | Audit records |

### 16.2 QC & QP Enforcement

Quality controls are embedded in workflows:
- Cannot ship without QC completion
- Cannot release without QP signature
- Cannot bypass mandatory tests
- Cannot modify released records

### 16.3 SAR Currency Control

Financial integrity maintained through:
- SAR as mandatory base currency
- All official documents in SAR
- Exchange rates for display only
- Audit trail on all financial transactions

### 16.4 ZATCA Compliance

Full compliance with Saudi e-invoicing requirements:
- Phase 2 compliant
- QR code on every invoice
- Digital signing
- Archive maintenance
- Submission reporting

### 16.5 Audit Readiness

The system supports regulatory inspections with:
- Complete batch history
- Electronic records integrity
- User access controls
- Change management documentation
- Training records integration

---

## 17. Conclusion

### 17.1 System Value Summary

The RadioPharma Order Management System delivers:

| Value Area | Benefit |
|------------|---------|
| **Operational Efficiency** | Streamlined workflows reduce manual effort and errors |
| **Regulatory Compliance** | Built-in controls ensure GMP and ZATCA compliance |
| **Customer Satisfaction** | Portal access provides transparency and convenience |
| **Financial Control** | Accurate invoicing and payment tracking |
| **Quality Assurance** | Comprehensive QC and release controls |
| **Traceability** | End-to-end visibility for every product |

### 17.2 System Readiness

The RadioPharma OMS is fully operational and ready to support:
- Daily production operations
- Multi-site deployments
- Regulatory inspections
- Business growth and expansion

### 17.3 Continuous Improvement

The system is designed for ongoing enhancement:
- Regular feature updates
- User feedback integration
- Regulatory change adaptation
- Performance optimization

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 2026 | RadioPharma Team | Initial Release |

---

*This document is confidential and intended for authorized recipients only.*
