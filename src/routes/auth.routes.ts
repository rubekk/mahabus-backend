import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';
import { registerSchema, loginSchema } from '@/validators';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.post('/refresh', authenticate, authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.myProfile)

export default router;
