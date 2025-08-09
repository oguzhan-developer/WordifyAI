/**
 * Centralized error handling and logging system
 * Created by Autonomous R&D Agent - Technical Debt Reduction
 */

import { NextResponse } from 'next/server'
import { ApiError, ErrorCode } from '@/lib/types/api'

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, any>
  public readonly timestamp: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message)
    
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service }
    )
  }
}

/**
 * Error logger with different severity levels
 */
export class ErrorLogger {
  private static instance: ErrorLogger
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'

  static getInstance(): ErrorLogger {
    if (!this.instance) {
      this.instance = new ErrorLogger()
    }
    return this.instance
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private formatError(error: Error | AppError, context?: Record<string, any>): Record<string, any> {
    const baseLog = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    }

    if (error instanceof AppError) {
      return {
        ...baseLog,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        isOperational: error.isOperational,
      }
    }

    return baseLog
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return
    console.debug('[DEBUG]', message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return
    console.info('[INFO]', message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return
    console.warn('[WARN]', message, context)
  }

  error(error: Error | string, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return
    
    if (typeof error === 'string') {
      console.error('[ERROR]', error, context)
    } else {
      const formattedError = this.formatError(error, context)
      console.error('[ERROR]', formattedError)
      
      // In production, send to external logging service
      if (process.env.NODE_ENV === 'production') {
        this.sendToExternalLogger(formattedError)
      }
    }
  }

  private async sendToExternalLogger(errorData: Record<string, any>): Promise<void> {
    // TODO: Implement external logging service integration
    // Examples: Sentry, LogRocket, Datadog, etc.
    try {
      // await externalLogger.log(errorData)
    } catch (logError) {
      console.error('[LOGGER ERROR] Failed to send to external service:', logError)
    }
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown, context?: Record<string, any>): NextResponse {
  const logger = ErrorLogger.getInstance()
  
  // Handle known AppError instances
  if (error instanceof AppError) {
    logger.error(error, context)
    
    const apiError: ApiError = {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      path: context?.path,
    }

    return NextResponse.json(
      { 
        success: false, 
        error: apiError.code,
        message: apiError.message,
        ...(process.env.NODE_ENV !== 'production' && { details: apiError.details })
      },
      { status: error.statusCode }
    )
  }

  // Handle validation errors (e.g., from Zod)
  if (error && typeof error === 'object' && 'issues' in error) {
    const validationError = new ValidationError('Validation failed', { issues: (error as any).issues })
    return handleApiError(validationError, context)
  }

  // Handle unknown errors
  const unknownError = error instanceof Error ? error : new Error(String(error))
  logger.error(unknownError, context)

  const genericError: ApiError = {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : unknownError.message,
    timestamp: new Date().toISOString(),
    path: context?.path,
  }

  return NextResponse.json(
    { 
      success: false, 
      error: genericError.code,
      message: genericError.message,
    },
    { status: 500 }
  )
}

/**
 * Async error wrapper for API handlers
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, {
        handler: handler.name,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg)),
      })
    }
  }
}

/**
 * Database error mapper
 */
export function mapDatabaseError(error: any): AppError {
  const message = error?.message || 'Database operation failed'
  
  // Map common database errors
  if (message.includes('duplicate key')) {
    return new ValidationError('Resource already exists', { originalError: message })
  }
  
  if (message.includes('foreign key constraint')) {
    return new ValidationError('Invalid reference to related resource', { originalError: message })
  }
  
  if (message.includes('not found')) {
    return new NotFoundError()
  }
  
  if (message.includes('timeout')) {
    return new DatabaseError('Database operation timed out', { originalError: message })
  }
  
  return new DatabaseError(message, { originalError: error })
}

/**
 * External service error mapper
 */
export function mapExternalServiceError(service: string, error: any): AppError {
  const message = error?.message || error?.response?.data?.message || 'Service unavailable'
  const status = error?.response?.status || error?.status
  
  if (status === 429) {
    return new RateLimitError(`Rate limit exceeded for ${service}`)
  }
  
  if (status >= 400 && status < 500) {
    return new ValidationError(`Invalid request to ${service}: ${message}`)
  }
  
  return new ExternalServiceError(service, message)
}

/**
 * Error boundary for React components (client-side)
 */
export function createErrorBoundary() {
  return class ErrorBoundary extends Error {
    constructor(message: string, public componentStack?: string) {
      super(message)
      this.name = 'ErrorBoundary'
    }
  }
}

/**
 * Performance-aware error handler that tracks error rates
 */
export class ErrorMetrics {
  private static errorCounts = new Map<string, number>()
  private static lastReset = Date.now()
  private static readonly RESET_INTERVAL = 60000 // 1 minute

  static recordError(errorCode: string): void {
    // Reset counters every minute
    if (Date.now() - this.lastReset > this.RESET_INTERVAL) {
      this.errorCounts.clear()
      this.lastReset = Date.now()
    }

    const current = this.errorCounts.get(errorCode) || 0
    this.errorCounts.set(errorCode, current + 1)
  }

  static getErrorRate(): Record<string, number> {
    return Object.fromEntries(this.errorCounts.entries())
  }

  static getHealthScore(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
    // Simple health score: 100% - error percentage (assuming 1000 requests per minute as baseline)
    return Math.max(0, 100 - (totalErrors / 10))
  }
}

// Export singleton instance
export const logger = ErrorLogger.getInstance()
