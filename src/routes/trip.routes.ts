import { Router } from 'express';
import { TripController } from '@/controllers/trip.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import { createTripSchema, updateTripSchema, tripFilterSchema } from '@/validators';

const router = Router();
const tripController = new TripController();

// Public routes
router.get('/', validateQuery(tripFilterSchema), tripController.getAllTrips);
router.get('/:id', tripController.getTripById);
router.get('/:id/seats', tripController.getAvailableSeats);

// Protected routes
router.use(authenticate);

// Create trip (admin and operators)
router.post('/', authorize('ADMIN', 'OPERATOR'), validate(createTripSchema), tripController.createTrip);

// Update trip (admin and operators)
router.put('/:id', authorize('ADMIN', 'OPERATOR'), validate(updateTripSchema), tripController.updateTrip);

// Delete trip (admin and operators)
router.delete('/:id', authorize('ADMIN', 'OPERATOR'), tripController.deleteTrip);

export default router;
