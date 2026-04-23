import express from 'express';
import { getSettings, updateSettings, changePasswordHandler, getStoreSettings, updateStoreSettings, uploadDocument } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const documentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/html', 'text/plain', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, HTML, TXT, JPEG, and PNG files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getSettings);
router.patch('/', updateSettings);
router.post('/change-password', changePasswordHandler);

// Document upload (DEA / State Pharmacy License)
router.post('/upload-document', documentUpload.single('file'), uploadDocument);

// FCR Store Settings (pharmacy-facing)
router.get('/store-settings', getStoreSettings);
router.patch('/store-settings', updateStoreSettings);

export default router;

