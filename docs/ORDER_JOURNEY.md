# RadioPharma OMS - Order Journey Documentation

## Overview

This document describes the complete lifecycle of an order in the RadioPharma Order Management System, from initial customer request through to final payment confirmation.

---

## Order Journey Stages

### 1. Order Creation

**Status:** `DRAFT`

Orders can be created through two channels:

| Channel | Description |
|---------|-------------|
| **Customer Portal** | Customers book capacity slots and submit orders online |
| **Order Desk** | Internal staff create orders for walk-in or phone customers |

**Key Activities:**
- Book delivery window/capacity slot
- Select product and specify activity requirements
- Provide delivery address and contact details
- Submit order request

---

### 2. Order Approval

**Status:** `PENDING_APPROVAL` → `APPROVED`

Multi-level approval workflow ensures order validity:

| Reviewer | Responsibility |
|----------|---------------|
| **Order Desk** | Validate order details, check product availability |
| **Manager** | Approve high-value or special orders |

**Outcomes:**
- ✅ **Approved** - Order proceeds to planning
- ❌ **Rejected** - Customer notified with reason

---

### 3. Production Planning

**Status:** `SCHEDULED`

**Critical Consideration:** Radiopharmaceuticals have short half-lives, requiring backward scheduling from delivery time.

**Key Activities:**
- Calculate production start time based on product half-life
- Create batch with assigned recipe/BOM
- Allocate equipment and resources
- Generate Electronic Batch Record (eBR)

**Backward Scheduling Formula:**
```
Production Start = Delivery Time - (Production Duration + QC Time + Dispensing Time + Transit Time)
```

---

### 4. Manufacturing

**Status:** `IN_PRODUCTION`

GMP-compliant production execution:

| Step | Description |
|------|-------------|
| **Material Consumption** | Consume raw materials from inventory with barcode scanning |
| **eBR Execution** | Follow step-by-step batch record with electronic signatures |
| **Deviation Recording** | Document any process deviations for investigation |
| **Production Complete** | Mark batch ready for QC testing |

---

### 5. Quality Control

**Status:** `QC_PENDING` → `QC_PASSED` → `RELEASED`

Rigorous quality testing ensures product safety and efficacy:

| Phase | Description |
|-------|-------------|
| **QC Testing** | Run product-specific quality tests (identity, purity, potency) |
| **Auto-Evaluation** | System automatically determines pass/fail based on specifications |
| **OOS Investigation** | Investigate any out-of-specification results |
| **QP Release** | Qualified Person reviews and releases batch |

**Test Types:**
- Radionuclidic purity
- Radiochemical purity
- pH testing
- Sterility testing
- Endotoxin testing

---

### 6. Dose Dispensing

**Status:** `DISPENSED`

**Critical Consideration:** Activity must be decay-corrected for calibration time.

**Key Activities:**
- Calculate decay-corrected activity for each dose
- Dispense individual patient-specific doses
- Print dose labels with QR codes
- Package doses in shielded containers
- Perform final QC check

**Decay Correction Formula:**
```
A(t) = A₀ × e^(-λt)
where λ = ln(2) / half-life
```

---

### 7. Logistics & Delivery

**Status:** `SHIPPED` → `DELIVERED`

Time-critical delivery management:

| Step | Description |
|------|-------------|
| **Shipment Creation** | Create shipment with assigned driver and vehicle |
| **Driver Pickup** | Driver collects package from production facility |
| **In Transit** | Real-time GPS tracking and temperature monitoring |
| **Delivery Confirmation** | Customer signature and proof of delivery capture |

**Delivery Requirements:**
- Radiation safety compliance
- Temperature control
- Chain of custody documentation
- Timely delivery within product expiry

---

### 8. Invoicing & Payment

**Status:** `INVOICED` → `PAID`

Financial processing with regulatory compliance:

| Step | Description |
|------|-------------|
| **Invoice Generation** | Apply contract pricing and generate invoice |
| **ZATCA Compliance** | Generate ZATCA-compliant QR code for Saudi regulations |
| **Payment Submission** | Customer submits payment with proof document |
| **Payment Confirmation** | Finance team confirms and generates receipt voucher |

**Supported Payment Methods:**
- Bank Transfer
- Cash
- Credit Card
- Cheque

---

### 9. Order Complete

**Status:** `COMPLETED`

**Final Activities:**
- Complete audit trail preserved
- Analytics and KPIs updated
- Customer feedback collected (optional)
- Order archived for regulatory retention

---

## Status Flow Diagram

```
DRAFT
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
SCHEDULED
  ↓
IN_PRODUCTION
  ↓
QC_PENDING
  ↓
QC_PASSED
  ↓
RELEASED
  ↓
DISPENSED
  ↓
SHIPPED
  ↓
DELIVERED
  ↓
INVOICED
  ↓
PAID
  ↓
COMPLETED
```

---

## Key Roles & Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Customer** | Place orders, track status, submit payments |
| **Order Desk** | Process orders, manage approvals |
| **Planner** | Schedule production, create batches |
| **Production** | Execute batch records, manufacture products |
| **QC Analyst** | Test products, record results |
| **QP (Qualified Person)** | Review QC, release batches |
| **Dispensing** | Dispense doses, package shipments |
| **Logistics** | Manage shipments, assign drivers |
| **Driver** | Deliver products, collect signatures |
| **Finance** | Generate invoices, confirm payments |
| **Admin** | System configuration, user management |

---

## Documents Generated

| Document | Stage | Purpose |
|----------|-------|---------|
| Order Confirmation | Approval | Confirms order details to customer |
| Electronic Batch Record | Manufacturing | GMP production documentation |
| QC Test Report | Quality | Records all quality test results |
| Certificate of Analysis | Release | Certifies batch quality |
| Dose Label | Dispensing | Patient-specific dose identification |
| Shipment Label | Logistics | Delivery and tracking information |
| Invoice | Invoicing | Payment request with ZATCA QR |
| Receipt Voucher | Payment | Payment confirmation document |

---

## Audit Trail

All order activities are logged with:
- Timestamp
- User ID and name
- Action performed
- Before/after values
- IP address
- Electronic signature (where required)

Audit logs are retained according to regulatory requirements (minimum 5 years for GMP records).

---

## Integration Points

| System | Integration |
|--------|-------------|
| **Email (Resend)** | Order confirmations, status updates, invoices |
| **SMS (Twilio)** | Critical notifications, delivery alerts |
| **WhatsApp (Twilio)** | Customer communications |
| **GPS Tracking** | Real-time delivery tracking |
| **Barcode/QR** | Material and dose identification |

---

## Time-Critical Considerations

Radiopharmaceuticals require special handling due to:

1. **Short Half-Lives** - Products decay rapidly (e.g., F-18: 110 min, Tc-99m: 6 hours)
2. **Backward Scheduling** - Production must be timed backward from delivery
3. **Decay Correction** - Activity must be adjusted for time of use
4. **Expiry Management** - Products expire within hours of production
5. **Cold Chain** - Some products require temperature control

---

*Document Version: 1.0*
*Last Updated: February 2026*
