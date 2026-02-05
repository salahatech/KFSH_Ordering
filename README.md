# RadioPharma OMS - Order Management System

A comprehensive web application for managing radiopharmaceutical manufacturing, covering the entire lifecycle from ordering and production to quality control, batch release, delivery, and dose dispensing.

## Features

- **Order Management**: Multi-level approval workflows, client ordering portal
- **Production Planning**: Batch grouping, equipment scheduling, electronic Batch Records (eBR)
- **Quality Control**: QC test templates, auto-evaluation, OOS/OOT investigations
- **Regulatory Compliance**: GMP-compliant electronic signatures, audit trails
- **Logistics**: Shipment tracking, driver management, proof of delivery
- **Financials**: Contracts, ZATCA-compliant invoicing, payment tracking
- **Inventory**: Warehouse control, location hierarchy, stock movements
- **Support Helpdesk**: Ticketing system with SLA tracking

## Prerequisites

### 1. Node.js (v20 or higher)
Download from: https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. PostgreSQL (v16 or higher)

**Windows:**
Download from https://www.postgresql.org/download/windows/

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Installation

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd radiopharma-oms
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE radiopharma_oms;

# Exit
\q
```

### Step 4: Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/radiopharma_oms"

# Authentication
JWT_SECRET="your-secret-key-here-make-it-long-and-random"

# Optional: Email Notifications (Resend)
RESEND_API_KEY="your-resend-api-key"

# Optional: SMS/WhatsApp Notifications (Twilio)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

### Step 5: Setup Database Schema
```bash
cd server
npx prisma generate
npx prisma db push
```

### Step 6: Seed Initial Data
```bash
cd server
npx tsx prisma/seed.ts
```

## Running the Application

You need to run both the backend and frontend servers:

### Terminal 1 - Backend Server
```bash
cd server
npx tsx src/index.ts
```
The backend API will be available at: `http://localhost:3001`

API Documentation (Swagger): `http://localhost:3001/api-docs`

### Terminal 2 - Frontend
```bash
cd client
npx vite --port 5000
```
The frontend will be available at: `http://localhost:5000`

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@radiopharma.com | admin123 |
| Order Desk | orderdesk@radiopharma.com | orderdesk123 |
| Planner | planner@radiopharma.com | planner123 |
| QC Analyst | qc@radiopharma.com | qc123 |
| QP (Quality Person) | qp@radiopharma.com | qp123 |
| Logistics | logistics@radiopharma.com | logistics123 |
| Driver | driver@radiopharma.com | driver123 |
| Finance | finance@radiopharma.com | finance123 |

## Project Structure

```
radiopharma-oms/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and API client
│   │   └── hooks/          # Custom React hooks
│   └── vite.config.ts      # Vite configuration
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Express middleware
│   │   └── index.ts        # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Database seeding
│   └── uploads/            # File uploads directory
├── e2e/                    # Playwright E2E tests
└── package.json            # Root dependencies
```

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Routing**: React Router v7
- **Internationalization**: react-i18next (English/Arabic with RTL)

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL in your `.env` file
- Ensure the database exists: `psql -U postgres -c "\l"`

### Port Already in Use
- Frontend: Change port in `client/vite.config.ts`
- Backend: Change port in `server/src/index.ts`

### Prisma Errors
```bash
cd server
npx prisma generate
npx prisma db push
```

### Missing Dependencies
```bash
npm install
```

## Running E2E Tests

```bash
# Install Playwright browsers
npm run e2e:setup

# Run tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Use Playwright UI mode
npm run test:e2e:ui
```

## License

Proprietary - All rights reserved
