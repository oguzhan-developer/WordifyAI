"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Lock, LogIn, UserPlus, Globe, Sparkles, AlertCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function setUserLocal(user: { name: string; email: string }) {
  try { localStorage.setItem("vocab_app_user", JSON.stringify(user)) } catch {}
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [transitioning, setTransitioning] = useState(false)
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loadingSignup, setLoadingSignup] = useState(false)
  const [loginTouched, setLoginTouched] = useState(false)
  const [signupTouched, setSignupTouched] = useState(false)
  const [loginInlineError, setLoginInlineError] = useState<string>("")
  const [signupInlineError, setSignupInlineError] = useState<string>("")

  const loginEmailValid = useMemo(() => isValidEmail(loginEmail), [loginEmail])
  const signupEmailValid = useMemo(() => isValidEmail(signupEmail), [signupEmail])

  useEffect(() => {
    if (!transitioning) return
    const t = setTimeout(() => setTransitioning(false), 800)
    return () => clearTimeout(t)
  }, [transitioning])

  const onLogin = async () => {
    setLoginInlineError("")
    if (!loginEmailValid) {
      setLoginTouched(true)
      setLoginInlineError("Geçerli bir e-posta adresi giriniz.")
      return
    }
    setLoadingLogin(true)
    try {
      // 1) Uygulama seviyesi kontrol
      const check = await fetch("/api/auth/login-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (!check.ok) {
        const result = await check.json().catch(() => ({}))
        if (result?.error === "user-not-found") {
          setLoginInlineError("Kullanıcı bulunamadı.")
          toast({ title: "Kullanıcı bulunamadı", description: "E-posta adresinizi kontrol edin.", variant: "destructive" })
        } else if (result?.error === "password-invalid") {
          setLoginInlineError("Parola hatalı.")
          toast({ title: "Parola hatalı", description: "Lütfen parolanızı kontrol edin.", variant: "destructive" })
        } else {
          setLoginInlineError("Giriş başarısız. Tekrar deneyin.")
          toast({ title: "Giriş başarısız", description: "Tekrar deneyin.", variant: "destructive" })
        }
        return
      }

      // 2) Supabase oturum
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error) {
        setLoginInlineError("Giriş başarısız. " + (error.message || "Tekrar deneyin."))
        toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" })
        return
      }

      const name = data.user?.user_metadata?.name || loginEmail.split("@")[0] || "User"
      setUserLocal({ name, email: data.user?.email || loginEmail })
      setTransitioning(true)
      setTimeout(() => router.replace("/app"), 300)
    } catch (err: any) {
      setLoginInlineError("Giriş hatası. " + (err?.message || "Bilinmeyen hata"))
      toast({ title: "Giriş hatası", description: err?.message || "Bilinmeyen hata", variant: "destructive" })
    } finally {
      setLoadingLogin(false)
    }
  }

  const onSignup = async () => {
    setSignupInlineError("")
    if (!signupEmailValid) {
      setSignupTouched(true)
      setSignupInlineError("Geçerli bir e-posta adresi giriniz.")
      return
    }
    setLoadingSignup(true)
    try {
      const resp = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, password: signupPassword, name: signupEmail.split("@")[0] || "NewUser" }),
      })
      const result = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = result?.details || "Kayıt başarısız. Tekrar deneyin."
        setSignupInlineError(msg)
        toast({ title: "Kayıt başarısız", description: msg, variant: "destructive" })
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: signupEmail, password: signupPassword })
      if (error) {
        setSignupInlineError(error.message || "Giriş başarısız. Tekrar deneyin.")
        toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" })
        return
      }

      const name = data.user?.user_metadata?.name || signupEmail.split("@")[0] || "NewUser"
      setUserLocal({ name, email: data.user?.email || signupEmail })
      setTransitioning(true)
      setTimeout(() => router.replace("/app"), 300)
    } catch (err: any) {
      setSignupInlineError(err?.message || "Kayıt hatası. Tekrar deneyin.")
      toast({ title: "Kayıt hatası", description: err?.message || "Bilinmeyen hata", variant: "destructive" })
    } finally {
      setLoadingSignup(false)
    }
  }

  const onGoogle = () => {
    // Örnek OAuth
    setUserLocal({ name: "Google User", email: "google-user@example.com" })
    router.replace("/app")
  }

  return (
    <div className="relative min-h-svh grid place-items-center bg-gradient-to-b from-sky-50 to-white">
      {transitioning && <div className="pointer-events-none fixed inset-0 bg-white/70 backdrop-blur-sm animate-[fadeIn_0.4s_ease]"></div>}
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="w-full max-w-md px-4">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-sky-100 grid place-items-center">
            <Globe className="text-sky-600" />
          </div>
          <h1 className="text-2xl font-semibold">{'WordifyAI'}</h1>
          <p className="text-sm text-muted-foreground">{'Hemen kelime öğrenmeye başla!'}</p>
        </div>

        <Card className="border-sky-100 shadow-sm">
          <CardHeader>
            <CardTitle>{'Giriş / Kayıt'}</CardTitle>
            <CardDescription>{'E-posta ile giriş yap ya da hızlıca kayıt ol.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{'Giriş Yap'}</TabsTrigger>
                <TabsTrigger value="signup">{'Kayıt Ol'}</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{'E-posta'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      placeholder="m@example.com"
                      type="email"
                      className={`pl-8 ${loginTouched && !loginEmailValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginInlineError("") }}
                      onBlur={() => setLoginTouched(true)}
                      aria-invalid={loginTouched && !loginEmailValid}
                    />
                  </div>
                  {loginTouched && !loginEmailValid && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Geçerli bir e-posta adresi giriniz.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{'Şifre'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      className="pl-8"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginInlineError("") }}
                      onKeyDown={(e) => { if (e.key === "Enter") onLogin() }}
                    />
                  </div>
                </div>
                {loginInlineError && (
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {loginInlineError}
                  </div>
                )}
                <Button className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50" onClick={onLogin} disabled={!loginEmailValid || loadingLogin}>
                  {loadingLogin ? "Giriş yapılıyor..." : (<><LogIn className="mr-2 h-4 w-4" /> {'Giriş Yap'}</>)}
                </Button>
                <Button variant="outline" className="w-full" onClick={onGoogle}>
                  <Image src="/google-logo-glyph.png" alt="Google" width={20} height={20} className="mr-2" />
                  {'Google ile devam et'}
                </Button>
              </TabsContent>

              {/* SIGNUP */}
              <TabsContent value="signup" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{'E-posta'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      placeholder="m@example.com"
                      type="email"
                      className={`pl-8 ${signupTouched && !signupEmailValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      value={signupEmail}
                      onChange={(e) => { setSignupEmail(e.target.value); setSignupInlineError("") }}
                      onBlur={() => setSignupTouched(true)}
                      aria-invalid={signupTouched && !signupEmailValid}
                    />
                  </div>
                  {signupTouched && !signupEmailValid && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Geçerli bir e-posta adresi giriniz.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{'Şifre'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      className="pl-8"
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setSignupInlineError("") }}
                      onKeyDown={(e) => { if (e.key === "Enter") onSignup() }}
                    />
                  </div>
                </div>
                {signupInlineError && (
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {signupInlineError}
                  </div>
                )}
                <Button className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50" onClick={onSignup} disabled={!signupEmailValid || loadingSignup}>
                  {loadingSignup ? "Kayıt yapılıyor..." : (<><UserPlus className="mr-2 h-4 w-4" /> {'Kayıt Ol'}</>)}
                </Button>
                <Button variant="outline" className="w-full">
                  <Image src="/google-logo-glyph.png" alt="Google" width={20} height={20} className="mr-2" />
                  {'Google ile devam et'}
                </Button>
              </TabsContent>
            </Tabs>
            <div className="mt-6 flex items-center justify-center text-xs text-muted-foreground">
              <Sparkles className="mr-2 h-4 w-4 text-sky-600" />
              {'Modern, sade ve hızlı öğrenme deneyimi.'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
