export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string = 'Bad request'): ApiError {
    return new ApiError(message, 400);
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401);
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(message, 403);
  }

  static notFound(message: string = 'Not found'): ApiError {
    return new ApiError(message, 404);
  }

  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError(message, 409);
  }

  static tooManyRequests(message: string = 'Too many requests'): ApiError {
    return new ApiError(message, 429);
  }
}

export default ApiError;
