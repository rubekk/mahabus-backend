import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';
import { successResponse } from '@/utils/response';

const authService = new AuthService();

export class AuthController {
    async generateOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json(
                    successResponse('Email is required', null)
                );
                return;
            }

            const otp = await authService.generateOTP(email);

            res.json(
                successResponse('OTP generated successfully', { otp })
            );
        } catch (error) {
            next(error);
        }
    }

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const isAdminCreating = req.user && req.user.role === 'ADMIN';

            const result = await authService.register(req.body, isAdminCreating);

            res.status(201).json(
                successResponse(
                    isAdminCreating 
                        ? 'User created successfully by admin' 
                        : 'User registered successfully', 
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.login(req.body);

            res.json(
                successResponse('Login successful', result)
            );
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json(
                    successResponse('User not authenticated', null)
                );
                return;
            }

            const result = await authService.refreshToken(userId);

            res.json(
                successResponse('Token refreshed successfully', result)
            );
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;

            res.json(
                successResponse('Profile retrieved successfully', { user })
            );
        } catch (error) {
            next(error);
        }
    }


    async myProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;
            console.log("request user: ", user)
            console.log(req)

            res.json(
                successResponse('Profile retrieved successfully', { user })
            );
        } catch (error) {
            next(error);
        }
    }
}
