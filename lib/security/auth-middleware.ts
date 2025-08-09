/**
 * Enhanced authentication middleware with security improvements
 * Created by Autonomous R&D Agent - Security Enhancement
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithToken } from '@/lib/supabase/server'
import { validateAuthHeader, RateLimiter, securityHeaders } from './input-validation'

// Rate limiter instances for different endpoints
const authRateLimiter = new RateLimiter(5, 60000) // 5 attempts per minute
const apiRateLimiter = new RateLimiter(60, 60000) // 60 requests per minute

/**
 * Enhanced token extraction with validation
 */
export function getValidatedToken(req: NextRequest | Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  return validateAuthHeader(authHeader)
}

/**
 * Get client IP address for rate limiting
 */
export function getClientIP(req: NextRequest | Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  // Fallback for local development
  return '127.0.0.1'
}

/**
 * Enhanced authentication middleware
 */
export async function withAuth(
  req: NextRequest | Request,
  handler: (req: NextRequest | Request, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Apply security headers
    const response = new NextResponse()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Rate limiting
    const clientIP = getClientIP(req)
    if (!apiRateLimiter.isAllowed(clientIP)) {
      return NextResponse.json(
        { error: 'rate-limit-exceeded', message: 'Too many requests' },
        { status: 429, headers: response.headers }
      )
    }

    // Token validation
    const token = getValidatedToken(req)
    if (!token) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid or missing authorization token' },
        { status: 401, headers: response.headers }
      )
    }

    // Authenticate with Supabase
    const supabase = createSupabaseServerClientWithToken(token)
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    
    if (userErr || !user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid user session' },
        { status: 401, headers: response.headers }
      )
    }

    // Call the handler with authenticated user
    const result = await handler(req, user)
    
    // Apply security headers to the result
    Object.entries(securityHeaders).forEach(([key, value]) => {
      result.headers.set(key, value)
    })
    
    return result
  } catch (error: any) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'internal-error', message: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * Enhanced authentication rate limiting for login endpoints
 */
export function withAuthRateLimit(clientIP: string): boolean {
  return authRateLimiter.isAllowed(clientIP)
}

/**
 * Password strength validator
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) score += 1
  else feedback.push('Use at least 8 characters')

  if (password.length >= 12) score += 1
  else feedback.push('Use 12+ characters for better security')

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Include lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Include uppercase letters')

  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Include numbers')

  if (/[^A-Za-z0-9]/.test(password)) score += 1
  else feedback.push('Include special characters')

  // Common patterns check
  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    feedback.push('Avoid repeating characters')
  }

  // Dictionary words check (basic)
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', 'dragon', 'pass', 'master'
  ]
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score -= 2
    feedback.push('Avoid common passwords')
  }

  return {
    isValid: score >= 4,
    score: Math.max(0, Math.min(6, score)),
    feedback
  }
}

/**
 * Session security validator
 */
export function validateSession(user: any): boolean {
  if (!user) return false
  if (!user.id) return false
  if (!user.email) return false
  if (!user.email_confirmed_at && process.env.NODE_ENV === 'production') return false
  
  return true
}

/**
 * Audit log for security events
 */
export class SecurityAuditLog {
  static async logEvent(event: {
    type: 'login' | 'signup' | 'password_change' | 'failed_auth' | 'rate_limit'
    userId?: string
    email?: string
    ip: string
    userAgent?: string
    details?: any
  }): Promise<void> {
    const logEntry = {
      ...event,
      timestamp: new Date().toISOString(),
      severity: event.type.includes('failed') || event.type === 'rate_limit' ? 'warning' : 'info'
    }
    
    // In production, this should be sent to a secure logging service
    console.log('[SECURITY AUDIT]', JSON.stringify(logEntry))
    
    // TODO: Implement secure logging to external service
    // await sendToSecureLogService(logEntry)
  }
}
