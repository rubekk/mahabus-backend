import { Request, Response, NextFunction } from 'express';
import { BookingService } from '@/services/booking.service';
import { successResponse } from '@/utils/response';

const bookingService = new BookingService();

export class BookingController {
  async getAllBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, fromDate, toDate } = req.query;
      const userId = req.user?.role === 'CUSTOMER' ? req.user.id : undefined;
      
      const result = await bookingService.getAllBookings(
        page as string,
        limit as string,
        userId,
        status as string,
        fromDate as string,
        toDate as string
      );
      
      res.json(
        successResponse('Bookings retrieved successfully', result.bookings, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      const booking = await bookingService.getBookingById(id, userId, userRole);
      
      res.json(
        successResponse('Booking retrieved successfully', booking)
      );
    } catch (error) {
      next(error);
    }
  }

  async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(
          successResponse('Authentication required', null)
        );
      }
      
      const booking = await bookingService.createBooking(req.body, userId);
      
      return res.status(201).json(
        successResponse('Booking created successfully', booking)
      );
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      const booking = await bookingService.cancelBooking(id, userId, userRole);
      
      res.json(
        successResponse('Booking cancelled successfully', booking)
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status, page, limit } = req.query;
      
      if (!userId) {
        return res.status(401).json(
          successResponse('Authentication required', null)
        );
      }
      
      const result = await bookingService.getUserBookings(
        userId,
        status as string,
        page as string,
        limit as string
      );
      
      return res.json(
        successResponse('User bookings retrieved successfully', result.bookings, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBookingStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.role === 'CUSTOMER' ? req.user.id : undefined;
      
      const stats = await bookingService.getBookingStatistics(userId);
      
      res.json(
        successResponse('Booking statistics retrieved successfully', stats)
      );
    } catch (error) {
      next(error);
    }
  }
}
