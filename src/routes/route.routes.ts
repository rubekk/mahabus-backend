import { Router } from 'express';
import { RouteController } from '@/controllers/route.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import { createRouteSchema, updateRouteSchema, paginationSchema } from '@/validators';

const router = Router();
const routeController = new RouteController();

// Public routes
router.get('/', validateQuery(paginationSchema), routeController.getAllRoutes);
router.get('/popular', routeController.getPopularRoutes);
router.get('/search', routeController.searchRoutes);
router.get('/:id', routeController.getRouteById);

// Protected routes
router.use(authenticate);

// Create route (admin and operators)
router.post('/', authorize('ADMIN', 'OPERATOR'), validate(createRouteSchema), routeController.createRoute);

// Update route (admin and operators)
router.put('/:id', authorize('ADMIN', 'OPERATOR'), validate(updateRouteSchema), routeController.updateRoute);

// Delete route (admin only)
router.delete('/:id', authorize('ADMIN'), routeController.deleteRoute);

export default router;
