/**
 * Comprehensive input validation and sanitization utilities
 * Created by Autonomous R&D Agent - Security Enhancement
 */

import { z } from 'zod'

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(3, 'Email too short')
  .max(254, 'Email too long')
  .transform(email => email.toLowerCase().trim())

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Word text validation
export const wordSchema = z
  .string()
  .min(1, 'Word cannot be empty')
  .max(50, 'Word too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'Word can only contain letters, spaces, hyphens, and apostrophes')
  .transform(word => word.trim())

// List name validation
export const listNameSchema = z
  .string()
  .min(1, 'List name cannot be empty')
  .max(100, 'List name too long')
  .transform(name => name.trim())

// Note validation
export const noteSchema = z
  .string()
  .max(500, 'Note too long')
  .transform(note => note.trim())
  .optional()

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')

// Meaning validation
export const meaningSchema = z
  .string()
  .min(1, 'Meaning cannot be empty')
  .max(200, 'Meaning too long')
  .transform(meaning => meaning.trim())

// Example sentence validation
export const exampleSchema = z
  .string()
  .min(1, 'Example cannot be empty')
  .max(300, 'Example too long')
  .transform(example => example.trim())

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitizes SQL input to prevent injection
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<\/?script[^>]*>/gi, '') // Remove script tags
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .trim()
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    return true
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static tokens: Set<string> = new Set()
  
  static generateToken(): string {
    const token = crypto.randomUUID()
    this.tokens.add(token)
    // Clean up old tokens after 1 hour
    setTimeout(() => this.tokens.delete(token), 3600000)
    return token
  }
  
  static validateToken(token: string): boolean {
    return this.tokens.has(token)
  }
  
  static removeToken(token: string): void {
    this.tokens.delete(token)
  }
}

/**
 * Secure header validation
 */
export function validateAuthHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2) return null
  if (!/^Bearer$/i.test(parts[0])) return null
  
  const token = parts[1]
  // Basic JWT format validation
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token)) {
    return null
  }
  
  return token
}

/**
 * Content Security Policy headers
 */
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
} as const
