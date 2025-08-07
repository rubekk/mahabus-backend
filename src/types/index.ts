import { Request } from 'express';
import { UserRole } from '@prisma/client';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: UserRole;
  otp?: string;
}

export interface OtpRequest {
  email: string;
}

export interface CreateRouteRequest {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
}

export interface CreateBusRequest {
  busNumber: string;
  busType: string;
  totalSeats: number;
  seatLayout: any;
  facilities: string[];
}

export interface CreateTripRequest {
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
}

export interface CreateBookingRequest {
  tripId: string;
  seatNumbers: string[];
  passengerDetails: Array<{
    name: string;
    phone: string;
    seatNumber: string;
  }>;
}

export interface PaymentRequest {
  bookingId: string;
  method: 'ESEWA' | 'KHALTI';
  amount: number;
}

export interface TripFilters {
  origin?: string;
  destination?: string;
  date?: string;
  minPrice?: number;
  maxPrice?: number;
  busType?: string;
  useContentBased?: boolean;
  userId?: string;
  prioritizeOccupancy?: boolean;
  minOccupancyThreshold?: number;
}

export interface SeatLayout {
  rows: number;
  seatsPerRow: number;
  layout: string[][];
}

export interface PassengerDetails {
  name: string;
  phone: string;
  seatNumber: string;
}

export interface BookingDetails {
  id: string;
  tripId: string;
  seatNumbers: string[];
  totalAmount: number;
  status: string;
  bookingReference: string;
  passengerDetails: PassengerDetails[];
  trip: {
    id: string;
    departureTime: Date;
    arrivalTime: Date;
    price: number;
    bus: {
      busNumber: string;
      busType: string;
    };
    route: {
      origin: string;
      destination: string;
    };
  };
}

export interface PaymentGatewayResponse {
  transactionId: string;
  status: string;
  amount: number;
  message?: string;
  [key: string]: any;
}
