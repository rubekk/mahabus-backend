import prisma from '@/config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '@/utils/errors';
import { validatePagination, paginationHelper } from '@/utils/response';
import { CreateRouteRequest } from '@/types';

export class RouteService {
  async getAllRoutes(page?: string, limit?: string) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    
    const where = { isActive: true };
    const total = await prisma.route.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const routes = await prisma.route.findMany({
      where,
      skip,
      take,
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

    return {
      routes,
      pagination,
    };
  }

  async getRouteById(routeId: string) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        trips: {
          where: {
            status: 'SCHEDULED',
            departureTime: {
              gte: new Date(),
            },
          },
          include: {
            bus: {
              select: {
                id: true,
                busNumber: true,
                busType: true,
                totalSeats: true,
              },
            },
          },
          orderBy: {
            departureTime: 'asc',
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError('Route not found');
    }

    return route;
  }

  async createRoute(data: CreateRouteRequest, requesterId?: string) {
    const { origin, destination, distance, duration } = data;

    // Check if route already exists
    const existingRoute = await prisma.route.findFirst({
      where: {
        origin: origin.toLowerCase(),
        destination: destination.toLowerCase(),
      },
    });

    if (existingRoute) {
      throw new ConflictError('Route already exists');
    }

    const route = await prisma.route.create({
      data: {
        origin,
        destination,
        distance,
        duration,
      },
    });

    return route;
  }

  async updateRoute(
    routeId: string,
    updateData: Partial<CreateRouteRequest & { isActive: boolean }>,
    requesterId?: string
  ) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundError('Route not found');
    }

    // Check if updating to a route that already exists
    if (updateData.origin || updateData.destination) {
      const origin = updateData.origin || route.origin;
      const destination = updateData.destination || route.destination;

      const existingRoute = await prisma.route.findFirst({
        where: {
          AND: [
            { origin: origin.toLowerCase() },
            { destination: destination.toLowerCase() },
            { id: { not: routeId } },
          ],
        },
      });

      if (existingRoute) {
        throw new ConflictError('Route already exists');
      }
    }

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: updateData,
    });

    return updatedRoute;
  }

  async deleteRoute(routeId: string, requesterId?: string) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        trips: {
          where: {
            status: 'SCHEDULED',
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError('Route not found');
    }

    // Check if route has active trips
    if (route.trips.length > 0) {
      throw new ConflictError('Cannot delete route with active trips');
    }

    await prisma.route.delete({
      where: { id: routeId },
    });

    return { message: 'Route deleted successfully' };
  }

  async getPopularRoutes(limit: number = 10) {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            trips: {
              where: {
                status: 'COMPLETED',
              },
            },
          },
        },
      },
      orderBy: {
        trips: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return routes;
  }

  async searchRoutes(origin?: string, destination?: string) {
    const where: any = { isActive: true };
    
    if (origin) {
      where.origin = {
        contains: origin,
        mode: 'insensitive',
      };
    }
    
    if (destination) {
      where.destination = {
        contains: destination,
        mode: 'insensitive',
      };
    }

    const routes = await prisma.route.findMany({
      where,
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

    return routes;
  }
}
