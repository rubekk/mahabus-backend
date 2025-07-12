import { Router } from 'express';
import { BookingController } from '@/controllers/booking.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import { createBookingSchema, bookingFilterSchema } from '@/validators';

const router = Router();
const bookingController = new BookingController();

// All routes require authentication
router.use(authenticate);

// Get all bookings (admin and operators see all, customers see only their bookings)
router.get('/', validateQuery(bookingFilterSchema), bookingController.getAllBookings);

// Get booking statistics
router.get('/stats', bookingController.getBookingStatistics);

// Get user's bookings
router.get('/my-bookings', bookingController.getUserBookings);

// Create booking (customers only)
router.post('/', authorize('CUSTOMER'), validate(createBookingSchema), bookingController.createBooking);

// Get booking by ID
router.get('/:id', bookingController.getBookingById);

// Cancel booking
router.put('/:id/cancel', bookingController.cancelBooking);

export default router;
