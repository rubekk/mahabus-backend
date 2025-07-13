import prisma from '@/config/database';
import { hashPassword, comparePassword, generateToken } from '@/utils/auth';
import { UnauthorizedError, ConflictError } from '@/utils/errors';
import { RegisterRequest, LoginRequest } from '@/types';
import { UserRole } from '@prisma/client';
import config from '@/config';

export class AuthService {
  async register(data: RegisterRequest) {
    const { email, password, name, phone, role = 'CUSTOMER' } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictError('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: role as UserRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (role === 'OPERATOR') {
      await prisma.operatorProfile.create({
        data: {
          userId: user.id,
          companyName: '',
          licenseNo: '',
          address: '',
          isVerified: true,
        },
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  async login(data: LoginRequest) {
    const { email, password } = data;

    if (email === config.admin.email && password === config.admin.password) {
      // Admin login
      const adminUser = {
        id: 'admin',
        email: config.admin.email,
        name: 'Admin',
        phone: '',
        role: 'ADMIN' as UserRole,
        isActive: true,
        createdAt: new Date(),
      };

      const token = generateToken({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      return {
        user: adminUser,
        token,
      };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async refreshToken(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid user');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { token };
  }
}
