import { Request, Response, NextFunction } from 'express';
import { BusService } from '@/services/bus.service';
import { successResponse } from '@/utils/response';

const busService = new BusService();

export class BusController {
  async getAllBuses(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, operatorId } = req.query;
      
      const result = await busService.getAllBuses(
        page as string,
        limit as string,
        operatorId as string
      );
      
      res.json(
        successResponse('Buses retrieved successfully', result.buses, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBusById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const bus = await busService.getBusById(id);
      
      res.json(
        successResponse('Bus retrieved successfully', bus)
      );
    } catch (error) {
      next(error);
    }
  }

  async createBus(req: Request, res: Response, next: NextFunction) {
    try {
      const { operatorId } = req.body;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      
      const bus = await busService.createBus(
        req.body,
        operatorId,
        requesterId,
        requesterRole
      );
      
      res.status(201).json(
        successResponse('Bus created successfully', bus)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateBus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      
      const bus = await busService.updateBus(id, req.body, requesterId, requesterRole);
      
      res.json(
        successResponse('Bus updated successfully', bus)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteBus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      
      const result = await busService.deleteBus(id, requesterId, requesterRole);
      
      res.json(
        successResponse('Bus deleted successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBusesByOperator(req: Request, res: Response, next: NextFunction) {
    try {
      const { operatorId } = req.params;
      
      const buses = await busService.getBusesByOperator(operatorId);
      
      res.json(
        successResponse('Operator buses retrieved successfully', buses)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBusStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const stats = await busService.getBusStatistics(id);
      
      res.json(
        successResponse('Bus statistics retrieved successfully', stats)
      );
    } catch (error) {
      next(error);
    }
  }
}
