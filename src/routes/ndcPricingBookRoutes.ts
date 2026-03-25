import { Router } from 'express';
import {
  upsertHandler,
  searchHandler,
  getByNdcHandler,
  deleteHandler,
  resolveHandler,
  importHandler,
} from '../controllers/ndcPricingBookController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticateProcessor } from '../middleware/processorAuth';

const router = Router();

const authenticateAny = async (req: any, res: any, next: any) => {
  try {
    await new Promise<void>((resolve, reject) => {
      authenticateProcessor(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return next();
  } catch {
    // Not a processor — fall through to admin auth
  }
  authenticateAdmin(req, res, next);
};

router.use(authenticateAny);

router.get('/search', searchHandler);
router.get('/resolve/:ndc', resolveHandler);
router.get('/:ndc', getByNdcHandler);
router.post('/', upsertHandler);
router.post('/import', importHandler);
router.delete('/:id', deleteHandler);

export default router;
