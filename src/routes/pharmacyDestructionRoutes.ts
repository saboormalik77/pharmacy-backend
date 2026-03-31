import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listHandler,
  statsHandler,
  updateHandler,
} from '../controllers/pharmacyDestructionController';

const router = Router();

router.use(authenticate);
router.get('/', listHandler);
router.get('/stats', statsHandler);
router.patch('/:id', updateHandler);

export default router;

