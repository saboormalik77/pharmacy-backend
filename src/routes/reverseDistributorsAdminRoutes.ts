import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { listReverseDistributorsHandler } from '../controllers/adminDistributorsController';

const router = Router();

// GET /api/admin/reverse-distributors — return id, name, email for dropdown population
router.get('/', authenticateAdmin, listReverseDistributorsHandler);

export default router;
