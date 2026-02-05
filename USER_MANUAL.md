# RadioPharma OMS - User Manual

**Version 1.0.0**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation](#navigation)
3. [Orders & Customers](#orders--customers)
4. [Production](#production)
5. [Quality Control](#quality-control)
6. [Logistics](#logistics)
7. [Inventory & Supply](#inventory--supply)
8. [Finance](#finance)
9. [Administration](#administration)
10. [Support Helpdesk](#support-helpdesk)
11. [User Settings](#user-settings)

---

## Getting Started

### Logging In

1. Open the application in your web browser
2. Enter your email address and password
3. Click **Sign In**

### Dashboard

After logging in, you'll see your personalized dashboard with:
- **Key Performance Indicators (KPIs)**: Orders, production, quality metrics
- **Recent Activity**: Latest orders, batches, and notifications
- **Quick Actions**: Common tasks based on your role

### Navigation

The sidebar contains 7 main sections:
- Orders & Customers
- Production
- Quality
- Logistics
- Inventory & Supply
- Finance
- Administration

Click the **collapse button** to minimize the sidebar for more workspace.

### Global Search

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows) to open the global search. Search for:
- Orders by number
- Customers by name
- Batches by ID
- Products by name

---

## Orders & Customers

### Orders

**View Orders:**
1. Navigate to **Orders & Customers > Orders**
2. Use filters to find specific orders by status, date, or customer
3. Click an order to view details

**Create New Order:**
1. Click **New Order**
2. Select customer and delivery date
3. Add products with quantities and required activity
4. Submit for approval

**Order Statuses:**
- **Draft**: Order being prepared
- **Pending Approval**: Awaiting management approval
- **Approved**: Ready for production planning
- **In Production**: Being manufactured
- **Ready**: Available for dispatch
- **Dispatched**: Out for delivery
- **Delivered**: Completed
- **Cancelled**: Order cancelled

### Customers

**View Customers:**
1. Navigate to **Orders & Customers > Customers**
2. Search by name, city, or customer code

**Add New Customer:**
1. Click **New Customer**
2. Fill in company details and contact information
3. Add Saudi National Address (required)
4. Set credit terms and payment conditions
5. Save

### Contacts

Manage customer contacts for each organization:
- Primary contacts for orders
- Finance contacts for invoicing
- Delivery contacts for logistics

---

## Production

### Production Schedule

View and manage the production calendar:
- **Gantt View**: Timeline of all batches
- **Heat Map**: Equipment utilization
- **List View**: Tabular batch listing

### Batches

**View Batch Details:**
1. Navigate to **Production > Batches**
2. Click a batch to see:
   - Batch information and status
   - Electronic Batch Record (eBR)
   - Material consumption
   - QC test results
   - Timeline of events

**Batch Statuses:**
- **Planned**: Scheduled for production
- **In Progress**: Currently being manufactured
- **Pending QC**: Awaiting quality control
- **QC Complete**: Quality testing finished
- **Released**: Approved by QP
- **Rejected**: Failed quality requirements

### Electronic Batch Records (eBR)

Execute production steps digitally:
1. Open a batch
2. Go to the **eBR** tab
3. Complete each step with:
   - Actual values and observations
   - Electronic signature (password confirmation)
   - Attachments if needed

### Equipment

Manage production equipment:
- View equipment status and availability
- Schedule maintenance
- Track usage history

---

## Quality Control

### QC Batch Testing

**Perform QC Tests:**
1. Navigate to **Quality > QC Batch Testing**
2. Select a batch pending QC
3. Enter test results for each parameter
4. System auto-evaluates against specifications
5. Submit results

**Test Evaluation:**
- **Pass**: Result within specification
- **Fail**: Result outside specification
- **OOS**: Out of Specification (requires investigation)
- **OOT**: Out of Trend (requires review)

### QC Test Definitions

View standard test methods:
- Visual Inspection
- pH Testing
- Radiochemical Purity
- Radionuclidic Purity
- Sterility
- Bacterial Endotoxins
- And more...

### Product QC Templates

Each product has defined QC requirements:
- Required tests
- Specification limits
- Acceptance criteria

### Batch Release (QP)

Qualified Persons release batches:
1. Navigate to **Quality > Batch Release**
2. Review batch documentation
3. Check all QC results
4. Apply electronic signature to release

---

## Logistics

### Shipments

**Create Shipment:**
1. Navigate to **Logistics > Shipments**
2. Click **New Shipment**
3. Select orders to include
4. Assign driver and vehicle
5. Set pickup time

**Track Shipments:**
- View real-time status
- See delivery timeline
- Access proof of delivery

### Drivers

Manage delivery personnel:
- Driver profiles and contact info
- License and certification tracking
- Delivery history

### Vehicles

Fleet management:
- Vehicle details and capacity
- Maintenance schedules
- Availability calendar

### Delivery Locations

Manage customer delivery addresses:
- Address details with GPS coordinates
- Delivery instructions
- Access requirements
- Location photos

---

## Inventory & Supply

### Inventory

**View Stock Levels:**
1. Navigate to **Inventory & Supply > Inventory**
2. See current quantities by location
3. Filter by material type or status

**Stock Movements:**
- Receipts (incoming)
- Issues (outgoing)
- Transfers between locations
- Adjustments

### Materials

Master data for all materials:
- Raw materials
- Packaging components
- Finished products
- Radioactive materials

### Goods Receiving (GRN)

Process incoming deliveries:
1. Navigate to **Inventory > Goods Receiving**
2. Create new GRN for supplier delivery
3. Enter quantities received
4. Perform incoming QC if required
5. Move to inventory location

### Suppliers

Manage supplier information:
- Company details
- Contact persons
- Product catalog
- Performance history

### Purchase Orders

Create and track purchase orders:
1. Navigate to **Inventory > Purchase Orders**
2. Select supplier and items
3. Submit for approval
4. Track delivery status

### Warehouses

Configure storage locations:
- Warehouse zones
- Storage conditions
- Location hierarchy (Zone > Aisle > Shelf > Bin)

---

## Finance

### Invoices

**Generate Invoice:**
1. Navigate to **Finance > Invoices**
2. Click **Generate Invoice**
3. Select delivered orders
4. Review line items and totals
5. Generate (creates ZATCA QR code)

**Invoice Features:**
- ZATCA-compliant QR codes
- PDF export with Arabic/English
- Email to customer

### Payments

**Record Payment:**
1. Navigate to **Finance > Payments**
2. Click **Record Payment**
3. Select invoice(s)
4. Enter payment details
5. Attach proof of payment

**Customer Payment Submission:**
Customers can submit payments through the portal:
1. Upload proof of payment
2. Enter payment reference
3. Submit for approval

### Contracts

Manage customer pricing agreements:
- Contract terms and validity
- Product pricing
- Volume discounts
- Payment terms

### Price Lists

Configure product pricing:
- Standard prices
- Customer-specific pricing
- Currency settings

---

## Administration

### Users

**Add New User:**
1. Navigate to **Administration > Users**
2. Click **New User**
3. Enter personal details
4. Assign role
5. Set initial password

### Roles & Permissions

Configure access control:
- View role definitions
- Assign permissions per role
- Create custom roles

### Products

Manage product catalog:
- Product details and codes
- Radioactive properties (half-life, isotope)
- Pricing information
- QC requirements

### Recipes / BOM

Define Bill of Materials:
- Raw materials required
- Quantities per batch
- Manufacturing steps

### System Settings

Configure system behavior:
- Company information
- Default values
- Workflow settings
- Integration settings

### Audit Trail

View system activity logs:
- User actions
- Data changes
- Login history
- Security events

### Announcements

Post system-wide announcements:
- Important notices
- Scheduled maintenance
- Policy updates

### Localization

Manage translations:
- Language settings
- Translation entries
- Exchange rates

---

## Support Helpdesk

### Creating a Ticket

1. Navigate to **Support > Helpdesk**
2. Click **New Ticket**
3. Select category (Support, Finance, Logistics, Quality, IT)
4. Enter subject and description
5. Set priority
6. Attach files if needed
7. Submit

### Ticket Communication

- **Public Replies**: Visible to all parties
- **Internal Notes**: Staff only (not visible to customers)
- **Attachments**: Documents, screenshots, etc.

### Ticket Tasks

Break down complex issues:
1. Open a ticket
2. Go to **Tasks** tab
3. Add tasks with assignees
4. Track completion

### SLA Tracking

Monitor response and resolution times:
- First response SLA
- Resolution SLA
- Breach warnings

---

## User Settings

### Profile

Update your personal information:
1. Click your name in the top right
2. Select **Profile**
3. Edit details and save

### Preferences

Customize your experience:
- **Language**: English or Arabic
- **Theme**: Light, Dark, or System
- **Timezone**: Your local timezone
- **Currency**: Display currency preference

### Notifications

Configure how you receive alerts:
- Email notifications
- SMS notifications
- WhatsApp notifications
- In-app notifications

### Change Password

1. Go to **Profile**
2. Click **Change Password**
3. Enter current and new password
4. Confirm

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Global Search | Cmd/Ctrl + K |
| Save | Cmd/Ctrl + S |
| New Item | Cmd/Ctrl + N |
| Close Modal | Esc |

---

## Tips & Best Practices

1. **Use Global Search**: Quickly find any record with Cmd/Ctrl + K
2. **Pin Favorite Pages**: Star frequently used pages for quick access
3. **Check Notifications**: Review the notification center regularly
4. **Attach Documents**: Use the attachment panel for supporting documents
5. **Electronic Signatures**: Always verify before signing - it creates an audit trail
6. **Regular Password Changes**: Update your password periodically for security

---

## Getting Help

If you encounter issues:
1. Check this user manual
2. Create a support ticket through the Helpdesk
3. Contact your system administrator

---

**RadioPharma OMS v1.0.0**
*Order Management System for Radiopharmaceutical Manufacturing*
