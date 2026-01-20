import express from 'express';
import cors from 'cors';
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
