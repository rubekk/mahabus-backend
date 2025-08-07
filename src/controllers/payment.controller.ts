import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '@/services/payment.service';
import { successResponse } from '@/utils/response';

const paymentService = new PaymentService();

export class PaymentController {
  async initiatePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json(
          successResponse('Authentication required', null)
        );
      }

      const result = await paymentService.initiatePayment(req.body, userId);

      return res.json(
        successResponse('Payment initiated successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyEsewaPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { oid, refId, amt } = req.query;
      const paymentReference = req.params.reference;

      const result = await paymentService.verifyEsewaPayment(
        paymentReference,
        oid as string,
        refId as string
      );

      res.json(
        successResponse('Payment verified successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyKhaltiPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const paymentReference = req.params.reference;

      const result = await paymentService.verifyKhaltiPayment(paymentReference, token);

      res.json(
        successResponse('Payment verified successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const payment = await paymentService.getPaymentById(id, userId, userRole);

      res.json(
        successResponse('Payment retrieved successfully', payment)
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { page, limit } = req.query;

      if (!userId) {
        return res.status(401).json(
          successResponse('Authentication required', null)
        );
      }

      const result = await paymentService.getUserPayments(
        userId,
        page as string,
        limit as string
      );

      res.json(
        successResponse('User payments retrieved successfully', result.payments, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== 'ADMIN' && userRole !== 'OPERATOR') {
        return res.status(403).json(
          successResponse('Access denied', null)
        );
      }

      const result = await paymentService.getAllPayments(
        userRole,
        userId,
        page as string,
        limit as string,
      );

      res.json(
        successResponse('All payments retrieved successfully', result.payments, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPaymentStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.role === 'CUSTOMER' ? req.user.id : undefined;

      const stats = await paymentService.getPaymentStatistics(userId);

      res.json(
        successResponse('Payment statistics retrieved successfully', stats)
      );
    } catch (error) {
      next(error);
    }
  }

  // Success/Failure callback handlers
  async esewaSuccess(req: Request, res: Response, next: NextFunction) {
    try {
      const { oid, refId, amt } = req.query;
      const paymentReference = req.params.reference;

      const result = await paymentService.verifyEsewaPayment(
        paymentReference,
        oid as string,
        refId as string
      );

      // Redirect to frontend success page
      res.redirect(`/payment-success?reference=${paymentReference}&status=success`);
    } catch (error) {
      res.redirect(`/payment-failure?reference=${req.params.reference}&error=verification_failed`);
    }
  }

  async esewaFailure(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentReference = req.params.reference;

      // Redirect to frontend failure page
      res.redirect(`/payment-failure?reference=${paymentReference}&status=failed`);
    } catch (error) {
      next(error);
    }
  }

  async khaltiSuccess(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      const paymentReference = req.params.reference;

      const result = await paymentService.verifyKhaltiPayment(paymentReference, token as string);

      // Redirect to frontend success page
      res.redirect(`/payment-success?reference=${paymentReference}&status=success`);
    } catch (error) {
      res.redirect(`/payment-failure?reference=${req.params.reference}&error=verification_failed`);
    }
  }

  async khaltiFailure(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentReference = req.params.reference;

      // Redirect to frontend failure page
      res.redirect(`/payment-failure?reference=${paymentReference}&status=failed`);
    } catch (error) {
      next(error);
    }
  }
}
