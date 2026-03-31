import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import { listReverseDistributorsHandler } from '../controllers/adminDistributorsController';

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('distributors'));

// GET /api/admin/reverse-distributors — return id, name, email for dropdown population
router.get('/', listReverseDistributorsHandler);

export default router;
