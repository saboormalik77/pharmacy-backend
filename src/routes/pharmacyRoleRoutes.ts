import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createRoleHandler,
  listRolesHandler,
  getRoleDetailHandler,
  updateRoleHandler,
  deleteRoleHandler,
  assignRoleToBranchHandler,
  removeRoleFromBranchHandler,
  listAllPermissionsHandler,
  getBranchPermissionsHandler,
} from '../controllers/pharmacyRoleController';

const router = express.Router();

router.get('/permissions', authenticate, listAllPermissionsHandler);
router.get('/branch-permissions/:branchId', authenticate, getBranchPermissionsHandler);
router.post('/', authenticate, createRoleHandler);
router.get('/', authenticate, listRolesHandler);
router.get('/:id', authenticate, getRoleDetailHandler);
router.put('/:id', authenticate, updateRoleHandler);
router.delete('/:id', authenticate, deleteRoleHandler);
router.post('/:roleId/assign/:branchId', authenticate, assignRoleToBranchHandler);
router.delete('/:roleId/assign/:branchId', authenticate, removeRoleFromBranchHandler);

export default router;
