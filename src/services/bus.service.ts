import prisma from '@/config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '@/utils/errors';
import { validatePagination, paginationHelper } from '@/utils/response';
import { CreateBusRequest } from '@/types';
import { UserRole } from '@prisma/client';

export class BusService {
  async getAllBuses(page?: string, limit?: string, operatorId?: string) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    
    const where: any = { isActive: true };
    if (operatorId) {
      where.operatorId = operatorId;
    }

    const total = await prisma.bus.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const buses = await prisma.bus.findMany({
      where,
      skip,
      take,
      include: {
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            trips: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      buses,
      pagination,
    };
  }

  async getBusById(busId: string) {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        trips: {
          where: {
            status: 'SCHEDULED',
            departureTime: {
              gte: new Date(),
            },
          },
          include: {
            route: {
              select: {
                id: true,
                origin: true,
                destination: true,
                distance: true,
                duration: true,
              },
            },
          },
          orderBy: {
            departureTime: 'asc',
          },
        },
      },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }

    return bus;
  }

  async createBus(
    data: CreateBusRequest,
    operatorId: string,
    requesterId?: string,
    requesterRole?: UserRole
  ) {
    const { busNumber, busType, totalSeats, seatLayout, facilities } = data;

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

    // Check if bus number already exists
    const existingBus = await prisma.bus.findUnique({
      where: { busNumber },
    });

    if (existingBus) {
      throw new ConflictError('Bus number already exists');
    }

    const bus = await prisma.bus.create({
      data: {
        operatorId: operator.id,
        busNumber,
        busType,
        totalSeats,
        seatLayout,
        facilities: facilities || [],
      },
      include: {
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
          },
        },
      },
    });

    return bus;
  }

  async updateBus(
    busId: string,
    updateData: Partial<CreateBusRequest & { isActive: boolean }>,
    requesterId?: string,
    requesterRole?: UserRole
  ) {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        operator: true,
      },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }

    // Check permissions
    if (requesterId && requesterRole) {
      const canUpdate = 
        requesterRole === 'ADMIN' || 
        (requesterRole === 'OPERATOR' && bus.operator.userId === requesterId);
      
      if (!canUpdate) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Check if updating to a bus number that already exists
    if (updateData.busNumber) {
      const existingBus = await prisma.bus.findUnique({
        where: { busNumber: updateData.busNumber },
      });

      if (existingBus && existingBus.id !== busId) {
        throw new ConflictError('Bus number already exists');
      }
    }

    const updatedBus = await prisma.bus.update({
      where: { id: busId },
      data: updateData,
      include: {
        operator: {
          select: {
            id: true,
            companyName: true,
            isVerified: true,
          },
        },
      },
    });

    return updatedBus;
  }

  async deleteBus(busId: string, requesterId?: string, requesterRole?: UserRole) {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        operator: true,
        trips: {
          where: {
            status: 'SCHEDULED',
          },
        },
      },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }

    // Check permissions
    if (requesterId && requesterRole) {
      const canDelete = 
        requesterRole === 'ADMIN' || 
        (requesterRole === 'OPERATOR' && bus.operator.userId === requesterId);
      
      if (!canDelete) {
        throw new ForbiddenError('Access denied');
      }
    }

    // Check if bus has active trips
    if (bus.trips.length > 0) {
      throw new ConflictError('Cannot delete bus with active trips');
    }

    await prisma.bus.delete({
      where: { id: busId },
    });

    return { message: 'Bus deleted successfully' };
  }

  async getBusesByOperator(operatorId: string) {
    const buses = await prisma.bus.findMany({
      where: { 
        operatorId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            trips: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return buses;
  }

  async getBusStatistics(busId: string) {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }

    const totalTrips = await prisma.trip.count({
      where: { busId },
    });

    const completedTrips = await prisma.trip.count({
      where: { 
        busId,
        status: 'COMPLETED',
      },
    });

    const totalBookings = await prisma.booking.count({
      where: {
        trip: {
          busId,
        },
      },
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        booking: {
          trip: {
            busId,
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalTrips,
      completedTrips,
      totalBookings,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}
