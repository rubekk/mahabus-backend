import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  role: Joi.string().valid('ADMIN', 'OPERATOR', 'CUSTOMER').optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  isActive: Joi.boolean().optional(),
});

// Route validation schemas
export const createRouteSchema = Joi.object({
  origin: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
  distance: Joi.number().positive().required(),
  duration: Joi.number().positive().required(),
});

export const updateRouteSchema = Joi.object({
  origin: Joi.string().min(2).max(100).optional(),
  destination: Joi.string().min(2).max(100).optional(),
  distance: Joi.number().positive().optional(),
  duration: Joi.number().positive().optional(),
  isActive: Joi.boolean().optional(),
});

// Bus validation schemas
export const createBusSchema = Joi.object({
  busNumber: Joi.string().min(3).max(20).required(),
  busType: Joi.string().min(2).max(50).required(),
  totalSeats: Joi.number().integer().min(1).max(100).required(),
  seatLayout: Joi.object().required(),
  facilities: Joi.array().items(Joi.string()).optional(),
});

export const updateBusSchema = Joi.object({
  busNumber: Joi.string().min(3).max(20).optional(),
  busType: Joi.string().min(2).max(50).optional(),
  totalSeats: Joi.number().integer().min(1).max(100).optional(),
  seatLayout: Joi.object().optional(),
  facilities: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});

// Trip validation schemas
export const createTripSchema = Joi.object({
  busId: Joi.string().required(),
  routeId: Joi.string().required(),
  departureTime: Joi.date().iso().required(),
  arrivalTime: Joi.date().iso().required(),
  price: Joi.number().positive().required(),
});

export const updateTripSchema = Joi.object({
  departureTime: Joi.date().iso().optional(),
  arrivalTime: Joi.date().iso().optional(),
  price: Joi.number().positive().optional(),
  status: Joi.string().valid('SCHEDULED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS').optional(),
});

// Booking validation schemas
export const createBookingSchema = Joi.object({
  tripId: Joi.string().required(),
  seatNumbers: Joi.array().items(Joi.string()).min(1).required(),
  passengerDetails: Joi.array().items(
    Joi.object({
      name: Joi.string().min(2).max(50).required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
      seatNumber: Joi.string().required(),
    })
  ).min(1).required(),
});

// Payment validation schemas
export const createPaymentSchema = Joi.object({
  bookingId: Joi.string().required(),
  method: Joi.string().valid('ESEWA', 'KHALTI', 'CASH').required(),
  amount: Joi.number().positive().required(),
});

// Operator profile validation schemas
export const createOperatorProfileSchema = Joi.object({
  companyName: Joi.string().min(2).max(100).required(),
  licenseNo: Joi.string().min(5).max(50).required(),
  address: Joi.string().min(10).max(200).required(),
});

export const updateOperatorProfileSchema = Joi.object({
  companyName: Joi.string().min(2).max(100).optional(),
  licenseNo: Joi.string().min(5).max(50).optional(),
  address: Joi.string().min(10).max(200).optional(),
  isVerified: Joi.boolean().optional(),
});

// Query validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const tripFilterSchema = Joi.object({
  origin: Joi.string().optional(),
  destination: Joi.string().optional(),
  date: Joi.date().iso().optional(),
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  busType: Joi.string().optional(),
}).concat(paginationSchema);

export const bookingFilterSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED').optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
}).concat(paginationSchema);
