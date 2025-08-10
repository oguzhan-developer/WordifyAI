import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClientAdmin } from "@/lib/supabase/server"
import { emailSchema, passwordSchema, securityHeaders } from "@/lib/security/input-validation"
import { getClientIP, withAuthRateLimit, SecurityAuditLog } from "@/lib/security/auth-middleware"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req)
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  try {
    // Apply security headers
    const response = NextResponse.json({ error: "init" })
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Rate limiting
    if (!withAuthRateLimit(clientIP)) {
      await SecurityAuditLog.logEvent({
        type: 'rate_limit',
        ip: clientIP,
        userAgent,
        details: { endpoint: '/api/auth/login-check' }
      })
      return NextResponse.json(
        { error: "rate-limit-exceeded", message: "Too many login attempts" },
        { status: 429, headers: response.headers }
      )
    }

    const body = await req.json()
    
    // Validate input with Zod schemas
    const emailResult = emailSchema.safeParse(body?.email)
    const passwordResult = passwordSchema.safeParse(body?.password)
    
    if (!emailResult.success || !passwordResult.success) {
      await SecurityAuditLog.logEvent({
        type: 'failed_auth',
        ip: clientIP,
        userAgent,
        details: { 
          reason: 'invalid_input',
          emailError: emailResult.error?.issues,
          passwordError: passwordResult.error?.issues
        }
      })
      return NextResponse.json(
        { error: "invalid-input", details: "Invalid email or password format" },
        { status: 400, headers: response.headers }
      )
    }

    const email = emailResult.data
    const password = passwordResult.data

    const supabase = createSupabaseServerClientAdmin()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, password_hash, name")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    if (error) {
      await SecurityAuditLog.logEvent({
        type: 'failed_auth',
        email,
        ip: clientIP,
        userAgent,
        details: { reason: 'db_error', error: error.message }
      })
      return NextResponse.json(
        { error: "db-error", details: "Database connection failed" },
        { status: 500, headers: response.headers }
      )
    }
    
    if (!data) {
      await SecurityAuditLog.logEvent({
        type: 'failed_auth',
        email,
        ip: clientIP,
        userAgent,
        details: { reason: 'user_not_found' }
      })
      return NextResponse.json(
        { error: "user-not-found" },
        { status: 404, headers: response.headers }
      )
    }

    if (!data.password_hash) {
      await SecurityAuditLog.logEvent({
        type: 'failed_auth',
        userId: data.id,
        email,
        ip: clientIP,
        userAgent,
        details: { reason: 'missing_hash' }
      })
      return NextResponse.json(
        { error: "password-invalid" },
        { status: 401, headers: response.headers }
      )
    }

    const ok = await bcrypt.compare(password, data.password_hash)
    if (!ok) {
      await SecurityAuditLog.logEvent({
        type: 'failed_auth',
        userId: data.id,
        email,
        ip: clientIP,
        userAgent,
        details: { reason: 'invalid_password' }
      })
      return NextResponse.json(
        { error: "password-invalid" },
        { status: 401, headers: response.headers }
      )
    }

    // Log successful login check
    await SecurityAuditLog.logEvent({
      type: 'login',
      userId: data.id,
      email,
      ip: clientIP,
      userAgent,
      details: { stage: 'credentials_verified' }
    })

    // Valid credentials at app-level; client should now call supabase.auth.signInWithPassword to establish session
    return NextResponse.json(
      { success: true, userId: data.id, email: data.email, name: data.name },
      { headers: response.headers }
    )
  } catch (e: any) {
    await SecurityAuditLog.logEvent({
      type: 'failed_auth',
      ip: clientIP,
      userAgent,
      details: { reason: 'unknown_error', error: e?.message }
    })
    return NextResponse.json(
      { error: "unknown", details: "Authentication failed" },
      { status: 500 }
    )
  }
}
