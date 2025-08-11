"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cardVariants } from "@/components/ui/card"
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  const [isLoginView, setIsLoginView] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleAuthAction = async () => {
    setError("")
    if (!email || !password) {
      setError("E-posta ve şifre alanları zorunludur.")
      return
    }
    setLoading(true)

    const authAction = isLoginView
      ? supabase.auth.signInWithPassword
      : supabase.auth.signUp

    const { data, error: authError } = await authAction({ email, password })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      toast({ title: "Authentication Error", description: authError.message, variant: "destructive" })
      return
    }

    if (data.user) {
      toast({ title: "Success!", description: `Welcome ${isLoginView ? 'back' : ''}!` })
      router.replace("/app")
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'var(--gradient-blue-pink)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">
            WordifyAI
          </h1>
          <p className="text-white/80 text-lg mt-2">
            Yapay zeka ile kelime hazinenizi geliştirin.
          </p>
        </div>

        <Card variant="glass" className="text-white">
          <CardHeader>
            <CardTitle className="text-h2 text-white">{isLoginView ? 'Giriş Yap' : 'Kayıt Ol'}</CardTitle>
            <CardDescription className="text-white/70">
              {isLoginView ? 'Hesabınıza erişmek için bilgilerinizi girin.' : 'Yeni bir hesap oluşturun.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-900/50 border border-red-500/50 rounded-md p-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button variant="primary" size="lg" className="w-full" onClick={handleAuthAction} disabled={loading}>
              {loading ? 'Yükleniyor...' : (isLoginView ? <><LogIn className="mr-2" /> Giriş Yap</> : <><UserPlus className="mr-2" /> Kayıt Ol</>)}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-navy/50 px-2 text-white/60 backdrop-blur-sm">
                  veya
                </span>
              </div>
            </div>

            <Button variant="glass" className="w-full" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
              <Image src="/google-logo-glyph.png" alt="Google" width={20} height={20} className="mr-2" />
              Google ile Devam Et
            </Button>

            <p className="text-center text-sm text-white/60">
              {isLoginView ? "Hesabınız yok mu? " : "Zaten bir hesabınız var mı? "}
              <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold hover:text-white underline">
                {isLoginView ? "Kayıt Olun" : "Giriş Yapın"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
