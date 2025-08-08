"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  useEffect(() => {
    try {
      // Check if onboarding is completed
      const onboardingCompleted = localStorage.getItem("vocab_app_onboarding_completed")

      if (!onboardingCompleted) {
        // First time user - show onboarding
        router.replace("/onboarding")
        return
      }

      // Check if user is logged in
      const raw = localStorage.getItem("vocab_app_user")
      if (raw) {
        router.replace("/app")
      } else {
        router.replace("/login")
      }
    } catch {
      router.replace("/onboarding")
    }
  }, [router])
  return (
    <main className="min-h-svh grid place-items-center">
      <p className="text-muted-foreground">{'Yükleniyor...'}</p>
    </main>
  )
}
