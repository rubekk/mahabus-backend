import prisma from '@/config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/utils/errors';
import { PaymentRequest, PaymentGatewayResponse } from '@/types';
import { generatePaymentReference } from '@/utils/auth';
import { validatePagination, paginationHelper } from '@/utils/response';
import config from '@/config';
import { UserRole } from '@prisma/client';

export class PaymentService {
  async initiatePayment(data: PaymentRequest, userId: string) {
    const { bookingId, method, amount } = data;

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          select: {
            id: true,
            departureTime: true,
            status: true,
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

    if (booking.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('Cannot pay for cancelled booking');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestError('Booking is already paid');
    }

    // Check if booking has already been paid
    if (booking.payments.length > 0) {
      throw new BadRequestError('Booking is already paid');
    }

    // Validate amount
    if (amount !== booking.totalAmount) {
      throw new BadRequestError('Payment amount does not match booking amount');
    }

    // Check if trip is still valid
    if (booking.trip.status !== 'SCHEDULED') {
      throw new BadRequestError('Trip is no longer available');
    }

    if (booking.trip.departureTime <= new Date()) {
      throw new BadRequestError('Cannot pay for past trips');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        userId,
        amount,
        method,
        paymentReference: generatePaymentReference(),
        status: 'PENDING',
      },
    });

    // Generate payment gateway URL based on method
    let gatewayUrl = '';
    let gatewayData = {};

    if (method === 'ESEWA') {
      gatewayUrl = await this.generateEsewaUrl(payment, booking);
      gatewayData = {
        merchantId: config.esewa.merchantId,
        amount: payment.amount,
        reference: payment.paymentReference,
        successUrl: config.esewa.successUrl,
        failureUrl: config.esewa.failureUrl,
      };
    } else if (method === 'KHALTI') {
      gatewayUrl = await this.generateKhaltiUrl(payment, booking);
      gatewayData = {
        publicKey: config.khalti.publicKey,
        amount: payment.amount * 100, // Khalti uses paisa
        reference: payment.paymentReference,
        successUrl: config.khalti.successUrl,
        failureUrl: config.khalti.failureUrl,
      };
    }

    return {
      payment: {
        id: payment.id,
        paymentReference: payment.paymentReference,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
      },
      gatewayUrl,
      gatewayData,
    };
  }

  private async generateEsewaUrl(payment: any, booking: any): Promise<string> {
    const params = new URLSearchParams({
      amt: payment.amount.toString(),
      pcd: config.esewa.merchantId,
      psc: '0',
      txAmt: '0',
      tAmt: payment.amount.toString(),
      pid: payment.paymentReference,
      scd: config.esewa.merchantId,
      su: config.esewa.successUrl,
      fu: config.esewa.failureUrl,
    });

    return `https://uat.esewa.com.np/epay/main?${params.toString()}`;
  }

  private async generateKhaltiUrl(payment: any, booking: any): Promise<string> {
    // In real implementation, you would make an API call to Khalti to get the payment URL
    // For now, returning a placeholder URL
    return `https://khalti.com/payment/verify/?token=${payment.paymentReference}`;
  }

  async verifyEsewaPayment(paymentReference: string, oid: string, refId: string) {
    const payment = await prisma.payment.findUnique({
      where: { paymentReference },
      include: {
        booking: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === 'COMPLETED') {
      throw new BadRequestError('Payment already completed');
    }

    // In real implementation, verify payment with eSewa API
    // For now, simulating successful verification
    const verificationResult = await this.verifyWithEsewaAPI(oid, refId, payment.amount);

    if (verificationResult.success) {
      return await this.completePayment(payment.id, {
        transactionId: refId,
        status: 'success',
        amount: payment.amount,
        gatewayResponse: verificationResult,
      });
    } else {
      return await this.failPayment(payment.id, verificationResult);
    }
  }

  async verifyKhaltiPayment(paymentReference: string, token: string) {
    const payment = await prisma.payment.findUnique({
      where: { paymentReference },
      include: {
        booking: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === 'COMPLETED') {
      throw new BadRequestError('Payment already completed');
    }

    // In real implementation, verify payment with Khalti API
    // For now, simulating successful verification
    const verificationResult = await this.verifyWithKhaltiAPI(token, payment.amount);

    if (verificationResult.success) {
      return await this.completePayment(payment.id, {
        transactionId: token,
        status: 'success',
        amount: payment.amount,
        gatewayResponse: verificationResult,
      });
    } else {
      return await this.failPayment(payment.id, verificationResult);
    }
  }

  private async verifyWithEsewaAPI(oid: string, refId: string, amount: number): Promise<any> {
    // Simulate API call to eSewa
    // In real implementation, make actual API call
    return {
      success: true,
      transactionId: refId,
      amount: amount,
      status: 'COMPLETE',
      message: 'Payment verified successfully',
    };
  }

  private async verifyWithKhaltiAPI(token: string, amount: number): Promise<any> {
    // Simulate API call to Khalti
    // In real implementation, make actual API call
    return {
      success: true,
      transactionId: token,
      amount: amount,
      status: 'COMPLETE',
      message: 'Payment verified successfully',
    };
  }

  private async completePayment(paymentId: string, gatewayResponse: PaymentGatewayResponse) {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        transactionId: gatewayResponse.transactionId,
        gatewayResponse: gatewayResponse,
      },
      include: {
        booking: {
          include: {
            trip: {
              select: {
                id: true,
                departureTime: true,
                arrivalTime: true,
                bus: {
                  select: {
                    busNumber: true,
                    busType: true,
                  },
                },
                route: {
                  select: {
                    origin: true,
                    destination: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Update booking status to confirmed
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: 'CONFIRMED',
      },
    });

    return payment;
  }

  private async failPayment(paymentId: string, gatewayResponse: any) {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        gatewayResponse: gatewayResponse,
      },
      include: {
        booking: true,
      },
    });

    return payment;
  }

  async getPaymentById(paymentId: string, userId?: string, userRole?: UserRole) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            trip: {
              select: {
                id: true,
                departureTime: true,
                arrivalTime: true,
                bus: {
                  select: {
                    busNumber: true,
                    busType: true,
                  },
                },
                route: {
                  select: {
                    origin: true,
                    destination: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check permissions
    if (userId && userRole) {
      const canView = 
        userRole === 'ADMIN' || 
        payment.userId === userId;
      
      if (!canView) {
        throw new ForbiddenError('Access denied');
      }
    }

    return payment;
  }

  async getUserPayments(userId: string, page?: string, limit?: string) {
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    
    const where = { userId };
    const total = await prisma.payment.count({ where });
    const { skip, take, pagination } = paginationHelper(pageNum, limitNum, total);

    const payments = await prisma.payment.findMany({
      where,
      skip,
      take,
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            seatNumbers: true,
            totalAmount: true,
            trip: {
              select: {
                id: true,
                departureTime: true,
                bus: {
                  select: {
                    busNumber: true,
                    busType: true,
                  },
                },
                route: {
                  select: {
                    origin: true,
                    destination: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      payments,
      pagination,
    };
  }

  async getPaymentStatistics(userId?: string) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const totalPayments = await prisma.payment.count({ where });
    
    const statusCounts = await prisma.payment.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    const methodCounts = await prisma.payment.groupBy({
      by: ['method'],
      where,
      _count: {
        id: true,
      },
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: {
        ...where,
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalPayments,
      statusCounts: statusCounts.map(stat => ({
        status: stat.status,
        count: stat._count.id,
      })),
      methodCounts: methodCounts.map(stat => ({
        method: stat.method,
        count: stat._count.id,
      })),
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}
