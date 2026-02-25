import { Response } from 'express';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendPaginated<T>(res: Response, data: T[], total: number, page: number, limit: number): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function sendError(res: Response, message: string, statusCode: number = 400): void {
  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
