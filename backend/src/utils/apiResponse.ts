import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function success(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function error(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export function paginated(
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number
) {
  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  return res.status(200).json({
    success: true,
    data,
    pagination,
  });
}
