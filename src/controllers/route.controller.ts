import { Request, Response, NextFunction } from 'express';
import { RouteService } from '@/services/route.service';
import { successResponse } from '@/utils/response';

const routeService = new RouteService();

export class RouteController {
  async getAllRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      
      const result = await routeService.getAllRoutes(
        page as string,
        limit as string
      );
      
      res.json(
        successResponse('Routes retrieved successfully', result.routes, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getRouteById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const route = await routeService.getRouteById(id);
      
      res.json(
        successResponse('Route retrieved successfully', route)
      );
    } catch (error) {
      next(error);
    }
  }

  async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterId = req.user?.id;
      
      const route = await routeService.createRoute(req.body, requesterId);
      
      res.status(201).json(
        successResponse('Route created successfully', route)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      
      const route = await routeService.updateRoute(id, req.body, requesterId);
      
      res.json(
        successResponse('Route updated successfully', route)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      
      const result = await routeService.deleteRoute(id, requesterId);
      
      res.json(
        successResponse('Route deleted successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPopularRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      
      const routes = await routeService.getPopularRoutes(
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(
        successResponse('Popular routes retrieved successfully', routes)
      );
    } catch (error) {
      next(error);
    }
  }

  async searchRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const { origin, destination } = req.query;
      
      const routes = await routeService.searchRoutes(
        origin as string,
        destination as string
      );
      
      res.json(
        successResponse('Routes found successfully', routes)
      );
    } catch (error) {
      next(error);
    }
  }
}
