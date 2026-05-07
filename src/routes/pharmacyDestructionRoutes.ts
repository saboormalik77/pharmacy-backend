import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listHandler,
  pendingHandler,
  statsHandler,
  getHandler,
  createHandler,
  updateHandler,
} from '../controllers/pharmacyDestructionController';

const router = Router();

router.use(authenticate);
router.get('/', listHandler);
router.get('/pending', pendingHandler);
router.get('/stats', statsHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);

export default router;

