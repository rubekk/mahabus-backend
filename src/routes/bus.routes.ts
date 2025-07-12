import { Router } from 'express';
import { BusController } from '@/controllers/bus.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import { createBusSchema, updateBusSchema, paginationSchema } from '@/validators';

const router = Router();
const busController = new BusController();

// Public routes
router.get('/', validateQuery(paginationSchema), busController.getAllBuses);
router.get('/:id', busController.getBusById);

// Protected routes
router.use(authenticate);

// Create bus (admin and operators)
router.post('/', authorize('ADMIN', 'OPERATOR'), validate(createBusSchema), busController.createBus);

// Update bus (admin and operators)
router.put('/:id', authorize('ADMIN', 'OPERATOR'), validate(updateBusSchema), busController.updateBus);

// Delete bus (admin and operators)
router.delete('/:id', authorize('ADMIN', 'OPERATOR'), busController.deleteBus);

// Get buses by operator (admin and operators)
router.get('/operator/:operatorId', authorize('ADMIN', 'OPERATOR'), busController.getBusesByOperator);

// Get bus statistics (admin and operators)
router.get('/:id/stats', authorize('ADMIN', 'OPERATOR'), busController.getBusStatistics);

export default router;
