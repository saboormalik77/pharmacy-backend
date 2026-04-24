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
import pharmacyWineCellarRoutes from './routes/pharmacyWineCellarRoutes';
import pharmacyDestructionRoutes from './routes/pharmacyDestructionRoutes';
import earningsEstimationRoutes from './routes/earningsEstimationRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import adminPharmaciesRoutes from './routes/adminPharmaciesRoutes';
import adminDistributorsRoutes from './routes/adminDistributorsRoutes';
import reverseDistributorsAdminRoutes from './routes/reverseDistributorsAdminRoutes';
import reverseDistributorsRoutes from './routes/reverseDistributorsRoutes';
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
import warehouseManagementRoutes from './routes/warehouseManagementRoutes';
import batchRoutes from './routes/batchRoutes';
import debitMemoRoutes from './routes/debitMemoRoutes';
import raTrackingRoutes from './routes/raTrackingRoutes';
import shipmentRoutes from './routes/shipmentRoutes';
import shipmentGroupRoutes from './routes/shipmentGroupRoutes';
import { pharmacyPaymentAdminRouter, pharmacyPaymentRouter } from './routes/pharmacyPaymentRoutes';
import pharmacyAnalyticsRoutes from './routes/pharmacyAnalyticsRoutes';
import ndcPricingBookRoutes from './routes/ndcPricingBookRoutes';
import pharmacyBranchRoutes from './routes/pharmacyBranchRoutes';
import pharmacyRoleRoutes from './routes/pharmacyRoleRoutes';
import mainAdminRoutes from './routes/mainAdminRoutes';
import pharmacyAdminBrandingRoutes from './routes/pharmacyAdminBrandingRoutes';
import pharmacyServiceRequestRoutes from './routes/pharmacyServiceRequestRoutes';
import processorServiceRequestRoutes from './routes/processorServiceRequestRoutes';
import processorNotificationRoutes from './routes/processorNotificationRoutes';
import pharmacyNotificationRoutes from './routes/pharmacyNotificationRoutes';
import adminServiceRequestRoutes from './routes/adminServiceRequestRoutes';
import pharmacyReportsRoutes from './routes/pharmacyReportsRoutes';
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
// Avoid 304 + If-None-Match for JSON APIs; clients otherwise keep showing stale list/detail bodies.
app.disable('etag');
const PORT = process.env.PORT || 3000;

// Open CORS: reflect any request Origin (required when credentials: true; * is invalid with cookies).
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Tenant-Domain',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
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
app.use('/api/barcodes', barcodeRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/distributors', distributorsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/wine-cellar', pharmacyWineCellarRoutes);
app.use('/api/destruction', pharmacyDestructionRoutes);
app.use('/api/earnings-estimation', earningsEstimationRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/pharmacies', adminPharmaciesRoutes);
app.use('/api/admin/distributors', adminDistributorsRoutes);
app.use('/api/admin/reverse-distributors', reverseDistributorsAdminRoutes);
app.use('/api/reverse-distributors', reverseDistributorsRoutes);
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
app.use('/api/admin/warehouse-management', warehouseManagementRoutes);
app.use('/api/admin/batches', batchRoutes);
app.use('/api/admin/debit-memos', debitMemoRoutes);
app.use('/api/admin/ra-tracking', raTrackingRoutes);
app.use('/api/admin/shipments', shipmentRoutes);
app.use('/api/admin/shipment-groups', shipmentGroupRoutes);
app.use('/api/admin/pharmacy-payments', pharmacyPaymentAdminRouter);
app.use('/api/pharmacy-payments', pharmacyPaymentRouter);
app.use('/api/analytics', pharmacyAnalyticsRoutes);
app.use('/api/admin/ndc-pricing', ndcPricingBookRoutes);
app.use('/api/pharmacy-branches', pharmacyBranchRoutes);
app.use('/api/pharmacy-roles', pharmacyRoleRoutes);
app.use('/api/main-admin', mainAdminRoutes);
app.use('/api/pharmacy', pharmacyAdminBrandingRoutes);
app.use('/api/on-site-service', pharmacyServiceRequestRoutes);
app.use('/api/processors/service-requests', processorServiceRequestRoutes);
app.use('/api/processors/notifications', processorNotificationRoutes);
app.use('/api/pharmacy/notifications', pharmacyNotificationRoutes);
app.use('/api/admin/service-requests', adminServiceRequestRoutes);
app.use('/api/pharmacy-reports', pharmacyReportsRoutes);

// Root route: serves an HTML page that detects Supabase recovery hash redirects.
// Supabase redirects to the backend base URL with #access_token=...&type=recovery.
// The hash never reaches the server, so this page reads it client-side, resolves
// the correct frontend URL from the DB via /api/auth/resolve-redirect, and
// redirects the browser to the correct pharmacy or admin portal.
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirecting...</title></head><body>
<p id="msg">Loading...</p>
<script>
(function(){
  var hash = window.location.hash;
  if (!hash || hash.indexOf('type=recovery') === -1) {
    document.getElementById('msg').textContent = 'Pharmacy Backend API is running.';
    return;
  }

  document.getElementById('msg').textContent = 'Redirecting to your portal...';

  // Parse the hash to get the access_token (JWT)
  var params = {};
  hash.substring(1).split('&').forEach(function(pair) {
    var kv = pair.split('=');
    params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
  });

  var token = params['access_token'];
  if (!token) {
    document.getElementById('msg').textContent = 'Error: no access token found.';
    return;
  }

  // Decode the JWT payload to extract email (no verification needed — just reading the claim)
  try {
    var payload = JSON.parse(atob(token.split('.')[1]));
    var email = payload.email;
    if (!email) throw new Error('no email');

    fetch('/api/auth/resolve-redirect?email=' + encodeURIComponent(email))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var base = data.url || '';
        if (!base) {
          document.getElementById('msg').textContent = 'Error: could not resolve portal URL.';
          return;
        }
        window.location.replace(base + '/reset-password' + hash);
      })
      .catch(function() {
        document.getElementById('msg').textContent = 'Error: failed to resolve redirect.';
      });
  } catch(e) {
    document.getElementById('msg').textContent = 'Error: invalid token.';
  }
})();
</script>
</body></html>`);
});

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

