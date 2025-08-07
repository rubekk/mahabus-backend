import { Request, Response, NextFunction } from 'express';
import { TripService } from '@/services/trip.service';
import { successResponse } from '@/utils/response';

const tripService = new TripService();

export class TripController {
  async getAllTrips(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page,
        limit,
        origin,
        destination,
        date,
        minPrice,
        maxPrice,
        busType,
        useContentBased,
        prioritizeOccupancy,
        minOccupancyThreshold
      } = req.query;
      const operatorUserId = req.user?.role === 'OPERATOR' ? req.user.id : undefined;

      const filters = {
        origin: origin as string,
        destination: destination as string,
        date: date as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        busType: busType as string,
        useContentBased: useContentBased === 'true',
        userId: req.user?.id,
        prioritizeOccupancy: prioritizeOccupancy === 'true',
        minOccupancyThreshold: minOccupancyThreshold ? parseFloat(minOccupancyThreshold as string) : undefined,
      };

      const result = await tripService.getAllTrips(
        page as string,
        limit as string,
        filters,
        operatorUserId
      );

      res.json(
        successResponse('Trips retrieved successfully', {
          trips: result.trips,
        }, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getTripById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const trip = await tripService.getTripById(id);

      res.json(
        successResponse('Trip retrieved successfully', trip)
      );
    } catch (error) {
      next(error);
    }
  }

  async createTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;

      const trip = await tripService.createTrip(
        req.body,
        requesterId,
        requesterRole
      );

      res.status(201).json(
        successResponse('Trip created successfully', trip)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;

      const trip = await tripService.updateTrip(id, req.body, requesterId, requesterRole);

      res.json(
        successResponse('Trip updated successfully', trip)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;

      const result = await tripService.deleteTrip(id, requesterId, requesterRole);

      res.json(
        successResponse('Trip deleted successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async getAvailableSeats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await tripService.getAvailableSeats(id);

      res.json(
        successResponse('Available seats retrieved successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }
}
