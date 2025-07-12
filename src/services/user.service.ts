import prisma from '@/config/database';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import { validatePagination, paginationHelper } from '@/utils/response';
import { UserRole } from '@prisma/client';

export class UserService {
  async getAllUsers(
    page?: string,
    limit?: string,
    role?: UserRole,
    requesterId?: string
  ) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    
    const where: any = {};
    if (role) {
      where.role = role;
    }

    const total = await prisma.user.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        operatorProfile: {
          select: {
            id: true,
            companyName: true,
            licenseNo: true,
            address: true,
            isVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      users,
      pagination,
    };
  }

  async getUserById(userId: string, requesterId?: string, requesterRole?: UserRole) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        operatorProfile: {
          select: {
            id: true,
            companyName: true,
            licenseNo: true,
            address: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user can view this profile
    if (requesterId && requesterRole) {
      const canView = 
        requesterRole === 'ADMIN' || 
        requesterId === userId;
      
      if (!canView) {
        throw new ForbiddenError('Access denied');
      }
    }

    return user;
  }

  async updateUser(
    userId: string,
    updateData: {
      name?: string;
      phone?: string;
      isActive?: boolean;
    },
    requesterId?: string,
    requesterRole?: UserRole
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check permissions
    if (requesterId && requesterRole) {
      const canUpdate = 
        requesterRole === 'ADMIN' || 
        requesterId === userId;
      
      if (!canUpdate) {
        throw new ForbiddenError('Access denied');
      }

      // Only admin can update isActive
      if (updateData.isActive !== undefined && requesterRole !== 'ADMIN') {
        delete updateData.isActive;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async deleteUser(userId: string, requesterId?: string, requesterRole?: UserRole) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check permissions - only admin can delete users
    if (requesterRole !== 'ADMIN') {
      throw new ForbiddenError('Only admins can delete users');
    }

    // Don't allow deleting yourself
    if (requesterId === userId) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  async getUserStats() {
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });

    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isActive: true },
    });

    return {
      totalUsers,
      activeUsers,
      roleDistribution: stats.map(stat => ({
        role: stat.role,
        count: stat._count.id,
      })),
    };
  }
}
