import { ApiResponse } from '@/types';

export const successResponse = <T>(
  message: string,
  data?: T,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    pagination,
  };
};

export const errorResponse = (
  message: string,
  errors?: any[]
): ApiResponse => {
  return {
    success: false,
    message,
    errors,
  };
};

export const paginationHelper = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  
  return {
    skip,
    take: limit,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const validatePagination = (page?: string, limit?: string) => {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '10', 10);
  
  return {
    page: pageNum > 0 ? pageNum : 1,
    limit: limitNum > 0 && limitNum <= 100 ? limitNum : 10,
  };
};
