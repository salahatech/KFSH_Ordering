import { Response } from 'express';
import crypto from 'crypto';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, any>;
  fieldErrors?: Array<{ field: string; message: string }>;
  traceId: string;
}

function generateTraceId(): string {
  return crypto.randomUUID();
}

export interface FieldError {
  field: string;
  message: string;
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  PRODUCT_NOT_PERMITTED: 'PRODUCT_NOT_PERMITTED',
  ORDER_TIME_NOT_FEASIBLE: 'ORDER_TIME_NOT_FEASIBLE',
  CAPACITY_FULL: 'CAPACITY_FULL',
  QC_FAILED: 'QC_FAILED',
  RESERVATION_NOT_FOUND: 'RESERVATION_NOT_FOUND',
  RESERVATION_INVALID_STATUS: 'RESERVATION_INVALID_STATUS',
  ORDER_CREATE_FAILED: 'ORDER_CREATE_FAILED',
  BATCH_NOT_RELEASED: 'BATCH_NOT_RELEASED',
  INSUFFICIENT_CAPACITY: 'INSUFFICIENT_CAPACITY',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CUSTOMER_NOT_LINKED: 'CUSTOMER_NOT_LINKED',
  CUSTOMER_ROLE_REQUIRES_CUSTOMER: 'CUSTOMER_ROLE_REQUIRES_CUSTOMER',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

const userMessages: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the form for errors and try again.',
  NOT_FOUND: 'The requested item could not be found.',
  UNAUTHORIZED: 'You need to log in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  INVALID_STATUS_TRANSITION: 'This action is not allowed for the current status.',
  LICENSE_EXPIRED: 'Customer license has expired. Please renew to continue.',
  PRODUCT_NOT_PERMITTED: 'This customer is not authorized to order this product.',
  ORDER_TIME_NOT_FEASIBLE: 'The selected delivery time is not feasible for this product.',
  CAPACITY_FULL: 'Production capacity is full for the selected time. Please try another slot.',
  QC_FAILED: 'Quality control failed for this batch. Orders cannot be dispatched.',
  RESERVATION_NOT_FOUND: 'The reservation could not be found.',
  RESERVATION_INVALID_STATUS: 'This reservation cannot be converted in its current status.',
  ORDER_CREATE_FAILED: 'Failed to create the order. Please try again.',
  BATCH_NOT_RELEASED: 'This batch has not been released by QP yet.',
  INSUFFICIENT_CAPACITY: 'There is not enough capacity available for this request.',
  DUPLICATE_ENTRY: 'This entry already exists.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  CUSTOMER_NOT_LINKED: 'Your account is not linked to a customer profile. Please contact support.',
  CUSTOMER_ROLE_REQUIRES_CUSTOMER: 'Customer role users must be linked to a customer record.',
};

export function createAppError(
  code: ErrorCode,
  message: string,
  options?: {
    userMessage?: string;
    details?: Record<string, any>;
    fieldErrors?: FieldError[];
  }
): AppError {
  const traceId = generateTraceId();
  return {
    code,
    message,
    userMessage: options?.userMessage || userMessages[code] || 'An error occurred.',
    details: options?.details,
    fieldErrors: options?.fieldErrors,
    traceId,
  };
}

export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  options?: {
    userMessage?: string;
    details?: Record<string, any>;
    fieldErrors?: FieldError[];
  }
): void {
  const error = createAppError(code, message, options);
  console.error(`[${error.traceId}] ${code}: ${message}`, options?.details || '');
  res.status(statusCode).json({ error });
}

export function sendValidationError(
  res: Response,
  fieldErrors: FieldError[],
  message?: string
): void {
  sendError(res, 400, ErrorCodes.VALIDATION_ERROR, message || 'Validation failed', {
    fieldErrors,
    userMessage: 'Please correct the highlighted fields and try again.',
  });
}

export function sendNotFound(
  res: Response,
  resource: string,
  id?: string
): void {
  sendError(res, 404, ErrorCodes.NOT_FOUND, `${resource} not found${id ? `: ${id}` : ''}`, {
    userMessage: `The ${resource.toLowerCase()} you're looking for doesn't exist or has been removed.`,
    details: { resource, id },
  });
}

export function sendInvalidStatusTransition(
  res: Response,
  currentStatus: string,
  attemptedAction: string
): void {
  sendError(res, 400, ErrorCodes.INVALID_STATUS_TRANSITION, 
    `Cannot ${attemptedAction} from status: ${currentStatus}`, {
    userMessage: `This action isn't allowed right now. Current status: ${currentStatus}.`,
    details: { currentStatus, attemptedAction },
  });
}

export function handlePrismaError(res: Response, error: any, resource: string): void {
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    sendError(res, 409, ErrorCodes.DUPLICATE_ENTRY, `Duplicate ${resource} entry`, {
      userMessage: `A ${resource.toLowerCase()} with this ${field} already exists.`,
      fieldErrors: [{ field, message: 'This value is already in use.' }],
    });
  } else if (error.code === 'P2025') {
    sendNotFound(res, resource);
  } else {
    console.error(`Prisma error for ${resource}:`, error);
    sendError(res, 500, ErrorCodes.DATABASE_ERROR, `Database error: ${error.message}`, {
      userMessage: 'A database error occurred. Please try again or contact support.',
    });
  }
}
