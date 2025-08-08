"use client"

import { type PropsWithChildren, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Toaster } from "@/components/ui/toaster"

export default function AppLayout({ children }: PropsWithChildren) {
  const path = usePathname()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [displayName, setDisplayName] = useState("Kullanıcı")

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const name = data.user?.user_metadata?.name || data.user?.email?.split("@")[0] || "Kullanıcı"
      setDisplayName(name)
      // keep a local cache to support landing redirect
      try {
        localStorage.setItem("vocab_app_user", JSON.stringify({ name, email: data.user?.email || "" }))
      } catch {}
    })()
  }, []) // eslint-disable-line

  const onLogout = async () => {
    try { await supabase.auth.signOut() } catch {}
    try { localStorage.removeItem("vocab_app_user") } catch {}
    router.replace("/login")
  }

  return (
    <div className="min-h-svh flex flex-col">
      <header className="sticky top-0 z-10 bg-white/75 backdrop-blur border-b">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{displayName}</span>
            <span className="ml-2 text-muted-foreground">WordifyAI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Çıkış">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-md px-4 pb-24">{children}</main>
      <BottomNav activePath={path || "/app"} />
      <Toaster />
    </div>
  )
}
