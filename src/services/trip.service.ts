import prisma from '@/config/database';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '@/utils/errors';
import { validatePagination, paginationHelper } from '@/utils/response';
import { CreateTripRequest, TripFilters } from '@/types';
import { UserRole } from '@prisma/client';

export class TripService {
  async getAllTrips(
    page?: string,
    limit?: string,
    filters?: TripFilters,
    operatorId?: string
  ) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);

    const where: any = {};

    if (operatorId) {
      where.operatorId = operatorId;
    }

    if (filters?.origin) {
      where.route = {
        origin: {
          contains: filters.origin,
          mode: 'insensitive',
        },
      };
    }

    if (filters?.destination) {
      where.route = {
        ...where.route,
        destination: {
          contains: filters.destination,
          mode: 'insensitive',
        },
      };
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      where.departureTime = {
        gte: date,
        lt: nextDay,
      };
    }

    if (filters?.minPrice || filters?.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice) {
        where.price.lte = filters.maxPrice;
      }
    }

    if (filters?.busType) {
      where.bus = {
        busType: {
          contains: filters.busType,
          mode: 'insensitive',
        },
      };
    }

    const total = await prisma.trip.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const trips = await prisma.trip.findMany({
      where,
      skip,
      take,
      include: {
        bus: {
          select: {
            id: true,
            busNumber: true,
            busType: true,
            totalSeats: true,
            facilities: true,
          },
        },
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            distance: true,
            duration: true,
          },
        },
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    return {
      trips,
      pagination,
    };
  }

  async getTripById(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: {
          select: {
            id: true,
            busNumber: true,
            busType: true,
            totalSeats: true,
            seatLayout: true,
            facilities: true,
          },
        },
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            distance: true,
            duration: true,
          },
        },
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
            user: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
          select: {
            id: true,
            seatNumbers: true,
            status: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // Calculate booked seats
    const bookedSeats = trip.bookings.reduce((acc: string[], booking: any) => {
      return acc.concat(booking.seatNumbers);
    }, [] as string[]);

    return {
      ...trip,
      bookedSeats,
    };
  }

  async createTrip(
    data: CreateTripRequest,
    requesterId?: string,
    requesterRole?: UserRole
  ) {
    const { busId, routeId, departureTime, arrivalTime, price } = data;

    // Verify operator exists
    const operator = await prisma.operatorProfile.findUnique({
      where: { userId: requesterId },
    });

    if (!operator) {
      throw new NotFoundError('Operator not found');
    }

    // Check permissions
    if (requesterId && requesterRole) {
      const canCreate =
        requesterRole === 'ADMIN' ||
        (requesterRole === 'OPERATOR' && operator.userId === requesterId);

      if (!canCreate) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Verify bus exists and belongs to operator
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }

    if (bus.operatorId !== operator.id) {
      throw new ForbiddenError('Bus does not belong to this operator');
    }

    // Verify route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundError('Route not found');
    }

    // Validate times
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);

    if (departure >= arrival) {
      throw new BadRequestError('Departure time must be before arrival time');
    }

    if (departure <= new Date()) {
      throw new BadRequestError('Departure time must be in the future');
    }

    // Check for overlapping trips for the same bus
    const overlappingTrip = await prisma.trip.findFirst({
      where: {
        busId,
        status: 'SCHEDULED',
        OR: [
          {
            AND: [
              { departureTime: { lte: departure } },
              { arrivalTime: { gt: departure } },
            ],
          },
          {
            AND: [
              { departureTime: { lt: arrival } },
              { arrivalTime: { gte: arrival } },
            ],
          },
          {
            AND: [
              { departureTime: { gte: departure } },
              { arrivalTime: { lte: arrival } },
            ],
          },
        ],
      },
    });

    if (overlappingTrip) {
      throw new ConflictError('Bus is already scheduled for this time period');
    }

    const trip = await prisma.trip.create({
      data: {
        busId,
        routeId,
        operatorId,
        departureTime: departure,
        arrivalTime: arrival,
        price,
        availableSeats: bus.totalSeats,
      },
      include: {
        bus: {
          select: {
            id: true,
            busNumber: true,
            busType: true,
            totalSeats: true,
            facilities: true,
          },
        },
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            distance: true,
            duration: true,
          },
        },
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
          },
        },
      },
    });

    return trip;
  }

  async updateTrip(
    tripId: string,
    updateData: Partial<CreateTripRequest> & { status?: string },
    requesterId?: string,
    requesterRole?: UserRole
  ) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        operator: true,
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // Check permissions
    if (requesterId && requesterRole) {
      const canUpdate =
        requesterRole === 'ADMIN' ||
        (requesterRole === 'OPERATOR' && trip.operator.userId === requesterId);

      if (!canUpdate) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Don't allow updating if trip has bookings and is not just status change
    if (trip.bookings.length > 0) {
      const allowedUpdates = ['status'];
      const hasOtherUpdates = Object.keys(updateData).some(key => !allowedUpdates.includes(key));

      if (hasOtherUpdates) {
        throw new BadRequestError('Cannot update trip details when there are active bookings');
      }
    }

    // Validate times if being updated
    if (updateData.departureTime || updateData.arrivalTime) {
      const departure = updateData.departureTime
        ? new Date(updateData.departureTime)
        : trip.departureTime;
      const arrival = updateData.arrivalTime
        ? new Date(updateData.arrivalTime)
        : trip.arrivalTime;

      if (departure >= arrival) {
        throw new BadRequestError('Departure time must be before arrival time');
      }
    }

    // Filter out fields that shouldn't be updated and prepare data for Prisma
    const { busId, routeId, ...filteredUpdateData } = updateData;

    // Convert string dates to Date objects for Prisma
    const prismaUpdateData: any = {};
    if (filteredUpdateData.departureTime) {
      prismaUpdateData.departureTime = new Date(filteredUpdateData.departureTime);
    }
    if (filteredUpdateData.arrivalTime) {
      prismaUpdateData.arrivalTime = new Date(filteredUpdateData.arrivalTime);
    }
    if (filteredUpdateData.price !== undefined) {
      prismaUpdateData.price = filteredUpdateData.price;
    }
    if (filteredUpdateData.status !== undefined) {
      prismaUpdateData.status = filteredUpdateData.status;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: prismaUpdateData,
      include: {
        bus: {
          select: {
            id: true,
            busNumber: true,
            busType: true,
            totalSeats: true,
            facilities: true,
          },
        },
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            distance: true,
            duration: true,
          },
        },
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
          },
        },
      },
    });

    return updatedTrip;
  }

  async deleteTrip(tripId: string, requesterId?: string, requesterRole?: UserRole) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        operator: true,
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // Check permissions
    if (requesterId && requesterRole) {
      const canDelete =
        requesterRole === 'ADMIN' ||
        (requesterRole === 'OPERATOR' && trip.operator.userId === requesterId);

      if (!canDelete) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Don't allow deleting if trip has active bookings
    if (trip.bookings.length > 0) {
      throw new ConflictError('Cannot delete trip with active bookings');
    }

    await prisma.trip.delete({
      where: { id: tripId },
    });

    return { message: 'Trip deleted successfully' };
  }

  async getAvailableSeats(tripId: string) {
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

    const bookedSeats = trip.bookings.reduce((acc: string[], booking: any) => {
      return acc.concat(booking.seatNumbers);
    }, [] as string[]);

    const availableSeats = trip.availableSeats;
    const seatLayout = trip.bus.seatLayout;

    return {
      availableSeats,
      bookedSeats,
      seatLayout,
    };
  }
}
