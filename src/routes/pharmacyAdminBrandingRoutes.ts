import { Router } from 'express';
import { getAdminBrandingHandler } from '../controllers/pharmacyAdminBrandingController';

const router = Router();

router.get('/admin-branding', getAdminBrandingHandler);

export default router;
