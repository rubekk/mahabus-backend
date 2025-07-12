import prisma from '@/config/database';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '@/utils/errors';
import { validatePagination, paginationHelper } from '@/utils/response';
import { CreateBookingRequest, BookingDetails } from '@/types';
import { generateBookingReference } from '@/utils/auth';
import { UserRole } from '@prisma/client';

export class BookingService {
  async getAllBookings(
    page?: string,
    limit?: string,
    userId?: string,
    status?: string,
    fromDate?: string,
    toDate?: string
  ) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const total = await prisma.booking.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const bookings = await prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        trip: {
          select: {
            id: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            status: true,
            bus: {
              select: {
                id: true,
                busNumber: true,
                busType: true,
                facilities: true,
              },
            },
            route: {
              select: {
                id: true,
                origin: true,
                destination: true,
                distance: true,
              },
            },
            operator: {
              select: {
                id: true,
                companyName: true,
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      bookings,
      pagination,
    };
  }

  async getBookingById(bookingId: string, userId?: string, userRole?: UserRole) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        trip: {
          select: {
            id: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            status: true,
            bus: {
              select: {
                id: true,
                busNumber: true,
                busType: true,
                facilities: true,
                seatLayout: true,
              },
            },
            route: {
              select: {
                id: true,
                origin: true,
                destination: true,
                distance: true,
              },
            },
            operator: {
              select: {
                id: true,
                companyName: true,
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check permissions
    if (userId && userRole) {
      const canView = 
        userRole === 'ADMIN' || 
        booking.userId === userId ||
        (userRole === 'OPERATOR' && booking.trip.operator.user);
      
      if (!canView) {
        throw new ForbiddenError('Access denied');
      }
    }

    return booking;
  }

  async createBooking(data: CreateBookingRequest, userId: string) {
    const { tripId, seatNumbers, passengerDetails } = data;

    // Verify trip exists and is available
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: {
          select: {
            totalSeats: true,
            seatLayout: true,
          },
        },
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
          select: {
            seatNumbers: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.status !== 'SCHEDULED') {
      throw new BadRequestError('Trip is not available for booking');
    }

    if (trip.departureTime <= new Date()) {
      throw new BadRequestError('Cannot book past trips');
    }

    // Check if requested seats are available
    const bookedSeats = trip.bookings.reduce((acc, booking) => {
      return acc.concat(booking.seatNumbers);
    }, [] as string[]);

    const unavailableSeats = seatNumbers.filter(seat => bookedSeats.includes(seat));
    if (unavailableSeats.length > 0) {
      throw new ConflictError(`Seats ${unavailableSeats.join(', ')} are already booked`);
    }

    // Validate passenger details match seat numbers
    if (passengerDetails.length !== seatNumbers.length) {
      throw new BadRequestError('Passenger details must match number of seats');
    }

    // Validate seat numbers in passenger details
    const passengerSeatNumbers = passengerDetails.map(p => p.seatNumber);
    const mismatchedSeats = seatNumbers.filter(seat => !passengerSeatNumbers.includes(seat));
    if (mismatchedSeats.length > 0) {
      throw new BadRequestError('Seat numbers in passenger details do not match requested seats');
    }

    // Calculate total amount
    const totalAmount = seatNumbers.length * trip.price;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        tripId,
        seatNumbers,
        totalAmount,
        passengerDetails,
        bookingReference: generateBookingReference(),
      },
      include: {
        trip: {
          select: {
            id: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            bus: {
              select: {
                id: true,
                busNumber: true,
                busType: true,
                facilities: true,
              },
            },
            route: {
              select: {
                id: true,
                origin: true,
                destination: true,
              },
            },
            operator: {
              select: {
                id: true,
                companyName: true,
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Update trip available seats
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        availableSeats: {
          decrement: seatNumbers.length,
        },
      },
    });

    return booking;
  }

  async cancelBooking(bookingId: string, userId?: string, userRole?: UserRole) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          select: {
            id: true,
            departureTime: true,
            operator: {
              select: {
                userId: true,
              },
            },
          },
        },
        payments: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check permissions
    if (userId && userRole) {
      const canCancel = 
        userRole === 'ADMIN' || 
        booking.userId === userId ||
        (userRole === 'OPERATOR' && booking.trip.operator.userId === userId);
      
      if (!canCancel) {
        throw new ForbiddenError('Access denied');
      }
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('Booking is already cancelled');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestError('Cannot cancel completed booking');
    }

    // Check if trip has already started (cannot cancel within 2 hours of departure)
    const twoHoursBeforeDeparture = new Date(booking.trip.departureTime.getTime() - 2 * 60 * 60 * 1000);
    if (new Date() > twoHoursBeforeDeparture) {
      throw new BadRequestError('Cannot cancel booking within 2 hours of departure');
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
      },
      include: {
        trip: {
          select: {
            id: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            bus: {
              select: {
                id: true,
                busNumber: true,
                busType: true,
              },
            },
            route: {
              select: {
                id: true,
                origin: true,
                destination: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    // Update trip available seats
    await prisma.trip.update({
      where: { id: booking.tripId },
      data: {
        availableSeats: {
          increment: booking.seatNumbers.length,
        },
      },
    });

    // If there are completed payments, initiate refund process
    if (booking.payments.length > 0) {
      for (const payment of booking.payments) {
        if (payment.status === 'COMPLETED') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'REFUNDED',
            },
          });
        }
      }
    }

    return updatedBooking;
  }

  async getUserBookings(userId: string, status?: string, page?: string, limit?: string) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const total = await prisma.booking.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const bookings = await prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        trip: {
          select: {
            id: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            status: true,
            bus: {
              select: {
                id: true,
                busNumber: true,
                busType: true,
                facilities: true,
              },
            },
            route: {
              select: {
                id: true,
                origin: true,
                destination: true,
              },
            },
            operator: {
              select: {
                id: true,
                companyName: true,
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      bookings,
      pagination,
    };
  }

  async getBookingStatistics(userId?: string) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const totalBookings = await prisma.booking.count({ where });
    
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        booking: where.userId ? { userId: where.userId } : {},
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalBookings,
      statusCounts: statusCounts.map(stat => ({
        status: stat.status,
        count: stat._count.id,
      })),
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}
