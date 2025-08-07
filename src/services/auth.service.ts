import prisma from '@/config/database';
import { hashPassword, comparePassword, generateToken, generateOTP } from '@/utils/auth';
import { UnauthorizedError, ConflictError, BadRequestError } from '@/utils/errors';
import { RegisterRequest, LoginRequest } from '@/types';
import { UserRole } from '@prisma/client';
import config from '@/config';
import { sendMail } from '@/utils/mail';

export class AuthService {
  async generateOTP(email: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete any existing OTPs for this email
    await prisma.otp.deleteMany({
      where: { email },
    });

    // Create new OTP record
    await prisma.otp.create({
      data: {
        email,
        otpCode: otp,
        expiresAt,
      },
    });

    await sendMail(
      email,
      'Your OTP Code',
      `Your OTP code is ${otp}. This code will expire in 10 minutes.`,
    );

    return { message: 'OTP sent successfully' };
  }

  async verifyOTP(email: string, otpCode: string) {
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email,
        otpCode,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      // Increment attempts for any valid OTP for this email
      await prisma.otp.updateMany({
        where: {
          email,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestError('Invalid or expired OTP');
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    return { message: 'OTP verified successfully' };
  }

  /**
   * Register a new user
   * @param data - User registration data
   * @param bypassOTP - Skip OTP verification (used when admin creates users)
   */
  async register(data: RegisterRequest, bypassOTP: boolean = false) {
    const { email, password, name, phone, role = 'CUSTOMER', otp } = data;

    // OTP verification (skip if bypassOTP is true - admin creation)
    if (!bypassOTP) {
      if (otp) {
        await this.verifyOTP(email, otp);
      } else {
        throw new BadRequestError('OTP is required for registration');
      }
    }

    // Check if user already exists (double check after OTP verification or admin creation)
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

    // Clean up used OTPs for this email
    await prisma.otp.deleteMany({
      where: { email },
    });

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
