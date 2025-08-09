/**
 * Secure API handler wrapper with comprehensive security features
 * Created by Autonomous R&D Agent - Security Enhancement
 */

import { NextRequest, NextResponse } from 'next/server'
import { getValidatedToken, getClientIP, SecurityAuditLog } from '@/lib/security/auth-middleware'
import { securityHeaders, RateLimiter } from '@/lib/security/input-validation'
import { createSupabaseServerClientWithToken } from '@/lib/supabase/server'

// Rate limiter for API endpoints
const apiRateLimiter = new RateLimiter(100, 60000) // 100 requests per minute
const sensitiveApiRateLimiter = new RateLimiter(20, 60000) // 20 requests per minute for sensitive operations

export interface SecureHandlerOptions {
  requireAuth?: boolean
  rateLimit?: 'normal' | 'sensitive' | 'none'
  validateInput?: boolean
  logActivity?: boolean
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    [key: string]: any
  }
}

/**
 * Secure API handler wrapper
 */
export function createSecureHandler(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: SecureHandlerOptions = {}
) {
  const {
    requireAuth = true,
    rateLimit = 'normal',
    validateInput = true,
    logActivity = true
  } = options

  return async function secureHandler(req: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const clientIP = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const method = req.method
    const url = req.url

    try {
      // Apply security headers
      const baseResponse = NextResponse.json({ temp: true })
      Object.entries(securityHeaders).forEach(([key, value]) => {
        baseResponse.headers.set(key, value)
      })

      // Rate limiting
      if (rateLimit !== 'none') {
        const limiter = rateLimit === 'sensitive' ? sensitiveApiRateLimiter : apiRateLimiter
        if (!limiter.isAllowed(clientIP)) {
          if (logActivity) {
            await SecurityAuditLog.logEvent({
              type: 'rate_limit',
              ip: clientIP,
              userAgent,
              details: { endpoint: url, method }
            })
          }
          return NextResponse.json(
            { error: 'rate-limit-exceeded', message: 'Too many requests' },
            { status: 429, headers: baseResponse.headers }
          )
        }
      }

      // Authentication
      let user: any = null
      if (requireAuth) {
        const token = getValidatedToken(req)
        if (!token) {
          if (logActivity) {
            await SecurityAuditLog.logEvent({
              type: 'failed_auth',
              ip: clientIP,
              userAgent,
              details: { reason: 'missing_token', endpoint: url, method }
            })
          }
          return NextResponse.json(
            { error: 'unauthorized', message: 'Authentication required' },
            { status: 401, headers: baseResponse.headers }
          )
        }

        const supabase = createSupabaseServerClientWithToken(token)
        const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser()
        
        if (userErr || !authUser?.id) {
          if (logActivity) {
            await SecurityAuditLog.logEvent({
              type: 'failed_auth',
              ip: clientIP,
              userAgent,
              details: { reason: 'invalid_token', endpoint: url, method, error: userErr?.message }
            })
          }
          return NextResponse.json(
            { error: 'unauthorized', message: 'Invalid authentication' },
            { status: 401, headers: baseResponse.headers }
          )
        }

        user = authUser
        // Add user to request object
        ;(req as AuthenticatedRequest).user = user
      }

      // Call the actual handler
      const result = await handler(req as AuthenticatedRequest)
      
      // Apply security headers to result
      Object.entries(securityHeaders).forEach(([key, value]) => {
        result.headers.set(key, value)
      })

      // Log successful request
      if (logActivity) {
        const duration = Date.now() - startTime
        await SecurityAuditLog.logEvent({
          type: 'login', // Using login as general success event
          userId: user?.id,
          ip: clientIP,
          userAgent,
          details: {
            endpoint: url,
            method,
            duration,
            status: result.status,
            success: true
          }
        })
      }

      return result

    } catch (error: any) {
      const duration = Date.now() - startTime
      
      if (logActivity) {
        await SecurityAuditLog.logEvent({
          type: 'failed_auth',
          ip: clientIP,
          userAgent,
          details: {
            endpoint: url,
            method,
            duration,
            error: error.message,
            stack: error.stack
          }
        })
      }

      console.error(`[SECURE HANDLER ERROR] ${method} ${url}:`, error)

      return NextResponse.json(
        { 
          error: 'internal-error',
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message 
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Input validation wrapper
 */
export function withValidation<T>(
  schema: any,
  handler: (req: AuthenticatedRequest, validatedData: T) => Promise<NextResponse>
) {
  return async function validatedHandler(req: AuthenticatedRequest): Promise<NextResponse> {
    try {
      const body = await req.json()
      const result = schema.safeParse(body)
      
      if (!result.success) {
        return NextResponse.json(
          {
            error: 'validation-error',
            message: 'Invalid input data',
            details: result.error.issues
          },
          { status: 400 }
        )
      }
      
      return await handler(req, result.data)
    } catch (error: any) {
      if (error.name === 'SyntaxError') {
        return NextResponse.json(
          { error: 'invalid-json', message: 'Invalid JSON format' },
          { status: 400 }
        )
      }
      throw error
    }
  }
}

/**
 * Database operation wrapper with error handling
 */
export async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (error: any) {
    console.error(`[DB ERROR] ${context}:`, error)
    
    // Sanitize error message for production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Database operation failed'
      : error.message
    
    return { data: null, error: errorMessage }
  }
}

/**
 * Response wrapper with consistent format
 */
export function createApiResponse<T>(
  data: T | null,
  error: string | null = null,
  status: number = 200
): NextResponse {
  if (error) {
    return NextResponse.json(
      { error, success: false },
      { status: status >= 200 && status < 300 ? 400 : status }
    )
  }
  
  return NextResponse.json(
    { data, success: true },
    { status }
  )
}
