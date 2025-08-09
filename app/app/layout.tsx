"use client"

import { type PropsWithChildren, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { LogOut, User } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Toaster } from "@/components/ui/toaster"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AppLayout({ children }: PropsWithChildren) {
  const path = usePathname()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [displayName, setDisplayName] = useState("Kullanıcı")
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const name = data.user?.user_metadata?.name || data.user?.email?.split("@")[0] || "Kullanıcı"
      const avatar = data.user?.user_metadata?.avatar || ""
      setDisplayName(name)
      setAvatarUrl(avatar)
      // keep a local cache to support landing redirect
      try {
        localStorage.setItem("vocab_app_user", JSON.stringify({ name, email: data.user?.email || "", avatar }))
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
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div>
              <span className="font-medium">{displayName}</span>
              <div className="text-xs text-muted-foreground">WordifyAI</div>
            </div>
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
