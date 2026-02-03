import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import batchRoutes from './routes/batches.js';
import qcRoutes from './routes/qc.js';
import logisticsRoutes from './routes/logistics.js';
import plannerRoutes from './routes/planner.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import notificationRoutes from './routes/notifications.js';
import configRoutes from './routes/config.js';
import approvalRoutes from './routes/approvals.js';
import dispensingRoutes from './routes/dispensing.js';
import availabilityRoutes from './routes/availability.js';
import reservationRoutes from './routes/reservations.js';
import contractRoutes from './routes/contracts.js';
import invoiceRoutes from './routes/invoices.js';
import settingsRoutes from './routes/settings.js';
import journeyRoutes from './routes/journey.js';
import dashboardRoutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';
import portalRoutes from './routes/portal.js';
import paymentRoutes from './routes/payments.js';
import invoicePdfRoutes from './routes/invoicePdf.js';
import driverRoutes from './routes/drivers.js';
import driverPortalRoutes from './routes/driverPortal.js';
import adminDemoRoutes from './routes/adminDemo.js';
import attachmentRoutes from './routes/attachments.js';
import supplierRoutes from './routes/suppliers.js';
import esignatureRoutes from './routes/esignatures.js';
import materialRoutes from './routes/materials.js';
import recipeRoutes from './routes/recipes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/shipments', logisticsRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dispensing', dispensingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoice-pdf', invoicePdfRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/driver', driverPortalRoutes);
app.use('/api/admin/demo', adminDemoRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/esignatures', esignatureRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/recipes', recipeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`RadioPharma OMS API running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

export default app;
