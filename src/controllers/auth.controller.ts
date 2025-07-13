import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';
import { successResponse } from '@/utils/response';

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.register(req.body);

            res.status(201).json(
                successResponse('User registered successfully', result)
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

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json(
                    successResponse('User not authenticated', null)
                );
            }

            const result = await authService.refreshToken(userId);

            return res.json(
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
