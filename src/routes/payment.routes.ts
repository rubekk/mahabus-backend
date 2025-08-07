import { Router } from 'express';
import { PaymentController } from '@/controllers/payment.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import { createPaymentSchema, paginationSchema } from '@/validators';

const router = Router();
const paymentController = new PaymentController();

// Public routes for payment gateway callbacks
router.get('/esewa/success/:reference', paymentController.esewaSuccess);
router.get('/esewa/failure/:reference', paymentController.esewaFailure);
router.get('/khalti/success/:reference', paymentController.khaltiSuccess);
router.get('/khalti/failure/:reference', paymentController.khaltiFailure);

// Protected routes
router.use(authenticate);

// Get all payments (admin and operator roles)
router.get('/', authorize('ADMIN', 'OPERATOR'), validateQuery(paginationSchema), paymentController.getAllPayments);

// Initiate payment (customers only)
router.post('/initiate', authorize('CUSTOMER'), validate(createPaymentSchema), paymentController.initiatePayment);

// Payment verification routes
router.get('/esewa/verify/:reference', paymentController.verifyEsewaPayment);
router.post('/khalti/verify/:reference', paymentController.verifyKhaltiPayment);

// Get payment by ID
router.get('/:id', paymentController.getPaymentById);

// Get user payments
router.get('/user/payments', validateQuery(paginationSchema), paymentController.getUserPayments);

// Get payment statistics
router.get('/stats', paymentController.getPaymentStatistics);

export default router;
