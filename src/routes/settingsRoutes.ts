import express from 'express';
import { getSettings, updateSettings, changePasswordHandler, getStoreSettings, updateStoreSettings } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getSettings);
router.patch('/', updateSettings);
router.post('/change-password', changePasswordHandler);

// FCR Store Settings (pharmacy-facing)
router.get('/store-settings', getStoreSettings);
router.patch('/store-settings', updateStoreSettings);

export default router;

