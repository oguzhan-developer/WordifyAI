"use client"

import { type PropsWithChildren } from "react"
import { Toaster } from "@/components/ui/toaster"

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
