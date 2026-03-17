import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes';
import returnReportRoutes from './routes/returnReportRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import returnsRoutes from './routes/returnsRoutes';
import productsRoutes from './routes/productsRoutes';
import productListsRoutes from './routes/productListsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import creditsRoutes from './routes/creditsRoutes';
import documentsRoutes from './routes/documentsRoutes';
import barcodeRoutes from './routes/barcodeRoutes';
import optimizationRoutes from './routes/optimizationRoutes';
import distributorsRoutes from './routes/distributorsRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import settingsRoutes from './routes/settingsRoutes';
import earningsEstimationRoutes from './routes/earningsEstimationRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import adminPharmaciesRoutes from './routes/adminPharmaciesRoutes';
import adminDistributorsRoutes from './routes/adminDistributorsRoutes';
import adminDocumentsRoutes from './routes/adminDocumentsRoutes';
import adminPaymentsRoutes from './routes/adminPaymentsRoutes';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes';
import adminUsersRoutes from './routes/adminUsersRoutes';
import adminSettingsRoutes from './routes/adminSettingsRoutes';
import adminMarketplaceRoutes from './routes/adminMarketplaceRoutes';
import adminRecentActivityRoutes from './routes/adminRecentActivityRoutes';
import processorsRoutes from './routes/processorsRoutes';
import processorMyRoutes from './routes/processorMyRoutes';
import returnTransactionRoutes from './routes/returnTransactionRoutes';
import returnTransactionItemsRoutes from './routes/returnTransactionItemsRoutes';
import barcodeScanRoutes from './routes/barcodeScanRoutes';
import pharmacyMarketplaceRoutes from './routes/pharmacyMarketplaceRoutes';
import ndcSearchRoutes from './routes/ndcSearchRoutes';
import inventoryAnalysisRoutes from './routes/inventoryAnalysisRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { adminPoliciesRouter, policyCheckRouter } from './routes/policiesRoutes';
import destructionRoutes from './routes/destructionRoutes';
import wineCellarRoutes from './routes/wineCellarRoutes';
import emailManagementRoutes from './routes/emailManagementRoutes';
import warehouseRoutes from './routes/warehouseRoutes';
import batchRoutes from './routes/batchRoutes';
import debitMemoRoutes from './routes/debitMemoRoutes';
import raTrackingRoutes from './routes/raTrackingRoutes';
import shipmentRoutes from './routes/shipmentRoutes';
import { pharmacyPaymentAdminRouter, pharmacyPaymentRouter } from './routes/pharmacyPaymentRoutes';
import pharmacyAnalyticsRoutes from './routes/pharmacyAnalyticsRoutes';
import { globalErrorHandler } from './controllers/errorController';
import { checkExpiringProductsAndNotify } from './services/notificationCronService';
import { surfaceReadyWineCellarItems } from './services/wineCellarCronService';
import { swaggerSpec } from './config/swagger';
import { initializeFirebase } from './services/firebaseService';
import cors from 'cors';

// Load environment variables
// Vercel provides env vars directly, so only load .env.local in development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

// Initialize Firebase Admin SDK for push notifications
initializeFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'https://pharmacy-ui-75vl.vercel.app', // Without trailing slash
  'https://pharmacy-ui-75vl.vercel.app/', // With trailing slash (for safety)
  'https://pharm-admin.vercel.app',
  'https://pharm-admin.vercel.app/',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Normalize origin by removing trailing slash for comparison
const normalizeOrigin = (origin: string): string => {
  return origin.replace(/\/$/, '');
};

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize the origin (remove trailing slash)
    const normalizedOrigin = normalizeOrigin(origin);
    
    // Always allow localhost origins (for local development)
    if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Check if normalized origin is in allowed list (also normalize allowed origins for comparison)
    const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // If origin is not in allowed list, block it
    console.warn(`CORS blocked origin: ${origin} (normalized: ${normalizedOrigin})`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
}));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Webhook route (must be before JSON middleware to get raw body)
import { handleWebhook } from './controllers/webhookController';
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Middleware (after webhook route)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/return-reports', returnReportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/product-lists', productListsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/distributors', distributorsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/earnings-estimation', earningsEstimationRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/pharmacies', adminPharmaciesRoutes);
app.use('/api/admin/distributors', adminDistributorsRoutes);
app.use('/api/admin/documents', adminDocumentsRoutes);
app.use('/api/admin/payments', adminPaymentsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/marketplace', adminMarketplaceRoutes);
app.use('/api/admin/recent-activity', adminRecentActivityRoutes);
app.use('/api/admin/processors', processorsRoutes);
app.use('/api/processors', processorMyRoutes);
app.use('/api/return-transactions', returnTransactionRoutes);
app.use('/api/return-transactions/:id/items', returnTransactionItemsRoutes);
app.use('/api/barcode', barcodeScanRoutes);
app.use('/api/marketplace', pharmacyMarketplaceRoutes);
app.use('/api/ndc-search', ndcSearchRoutes);
app.use('/api/inventory-analysis', inventoryAnalysisRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/policies', adminPoliciesRouter);
app.use('/api/policies', policyCheckRouter);
app.use('/api/admin/destruction', destructionRoutes);
app.use('/api/admin/wine-cellar', wineCellarRoutes);
app.use('/api/admin/emails', emailManagementRoutes);
app.use('/api/admin/warehouse', warehouseRoutes);
app.use('/api/admin/batches', batchRoutes);
app.use('/api/admin/debit-memos', debitMemoRoutes);
app.use('/api/admin/ra-tracking', raTrackingRoutes);
app.use('/api/admin/shipments', shipmentRoutes);
app.use('/api/admin/pharmacy-payments', pharmacyPaymentAdminRouter);
app.use('/api/pharmacy-payments', pharmacyPaymentRouter);
app.use('/api/analytics', pharmacyAnalyticsRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Server is running
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

// Export app for Vercel serverless functions
export default app;

// Only start server if not running on Vercels
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    
    // Start the cron job interval (runs every 1 minute)
    console.log('🔄 Starting expiring products cron job (every 1 minute)...');
    
    setInterval(async () => {
      try {
        console.log('⏰ Running expiring products check...');
        const result = await checkExpiringProductsAndNotify();
        console.log(`✅ Cron completed: ${result.notificationsCreated} notifications, ${result.emailsSent} emails sent`);
      } catch (error: any) {
        console.error('❌ Cron job error:', error.message);
      }
    }, 60 * 1000); // 60 seconds = 1 minute
    
    console.log('🔔 Cron job scheduled to run every 1 minute');

    // Wine Cellar surface check - runs once daily at 2 AM
    console.log('🍷 Starting wine cellar surface check cron job (daily at 2 AM)...');
    
    // Run immediately on startup
    surfaceReadyWineCellarItems().catch((error: any) => {
      console.error('❌ Wine cellar cron startup error:', error.message);
    });
    
    // Then schedule for daily runs at 2 AM
    setInterval(async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Run at 2:00 AM (check every hour, but only execute at 2 AM)
      if (hours === 2 && minutes === 0) {
        try {
          console.log('⏰ Running wine cellar surface check...');
          const result = await surfaceReadyWineCellarItems();
          console.log(`✅ Wine cellar cron completed: ${result.surfacedCount} items surfaced`);
        } catch (error: any) {
          console.error('❌ Wine cellar cron error:', error.message);
        }
      }
    }, 60 * 60 * 1000); // Check every hour
    
    console.log('🔔 Wine cellar cron scheduled to run daily at 2:00 AM');
  });
}

