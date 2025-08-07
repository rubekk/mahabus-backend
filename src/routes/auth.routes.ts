import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { registerSchema, loginSchema, otpSchema } from '@/validators';

const router = Router();
const authController = new AuthController();

// Public routes (with optional auth for admin bypass)
router.post('/otp', validate(otpSchema), authController.generateOTP);
router.post('/register', optionalAuth, validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.post('/refresh', authenticate, authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.myProfile);

export default router;
