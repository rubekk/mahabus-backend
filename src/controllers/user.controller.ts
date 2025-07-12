import { Request, Response, NextFunction } from 'express';
import { UserService } from '@/services/user.service';
import { successResponse } from '@/utils/response';

const userService = new UserService();

export class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, role } = req.query;
      const requesterId = req.user?.id;
      
      const result = await userService.getAllUsers(
        page as string,
        limit as string,
        role as any,
        requesterId
      );
      
      res.json(
        successResponse('Users retrieved successfully', result.users, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      
      const user = await userService.getUserById(id, requesterId, requesterRole);
      
      res.json(
        successResponse('User retrieved successfully', user)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      
      const user = await userService.updateUser(id, req.body, requesterId, requesterRole);
      
      res.json(
        successResponse('User updated successfully', user)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      
      const result = await userService.deleteUser(id, requesterId, requesterRole);
      
      res.json(
        successResponse('User deleted successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await userService.getUserStats();
      
      res.json(
        successResponse('User statistics retrieved successfully', stats)
      );
    } catch (error) {
      next(error);
    }
  }
}
