"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vocab_app_user")
      if (raw) {
        router.replace("/app")
      } else {
        router.replace("/login")
      }
    } catch {
      router.replace("/login")
    }
  }, [router])
  return (
    <main className="min-h-svh grid place-items-center">
      <p className="text-muted-foreground">{'Yükleniyor...'}</p>
    </main>
  )
}
