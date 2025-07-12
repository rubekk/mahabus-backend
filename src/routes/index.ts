import { Router } from 'express';
import authRoutes from './auth.routes';
import bookingRoutes from './booking.routes';
import busRoutes from './bus.routes';
import paymentRoutes from './payment.routes';
import routeRoutes from './route.routes';
import tripRoutes from './trip.routes';
import userRoutes from './user.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/routes', routeRoutes);
router.use('/buses', busRoutes);
router.use('/trips', tripRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);

// Health check endpoint
router.get('/health', (_, res) => {
    res.json({
        success: true,
        message: 'Bus Ticketing API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

export default router;
