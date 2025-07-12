import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { updateUserSchema } from '@/validators';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize('ADMIN'), userController.getAllUsers);

// Get user statistics (admin only)
router.get('/stats', authorize('ADMIN'), userController.getUserStats);

// Get user by ID (admin or self)
router.get('/:id', userController.getUserById);

// Update user (admin or self)
router.put('/:id', validate(updateUserSchema), userController.updateUser);

// Delete user (admin only)
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

export default router;
