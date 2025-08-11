"use client"

import Link from "next/link"
import { Home, List, PlayCircle, BarChart3, User } from 'lucide-react'
import { cn } from "@/lib/utils"

export function BottomNav({ activePath = "/app" }: { activePath?: string }) {
  const items = [
    { href: "/app", label: "Ana Sayfa", icon: Home },
    { href: "/app/lists", label: "Listeler", icon: List },
    { href: "/app/learn/select-list", label: "Öğren", icon: PlayCircle },
    { href: "/app/stats", label: "İstatistikler", icon: BarChart3 },
    { href: "/app/profile", label: "Profil", icon: User },
  ]

  return (
    <nav
      aria-label="Alt menü"
      className="fixed bottom-0 left-0 right-0 z-10 h-[80px] px-5"
      style={{
        background: "rgba(255, 255, 255, 0.01)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <ul className="mx-auto flex h-full max-w-md items-center justify-around">
        {items.map((it) => {
          const active = activePath.startsWith(it.href.split("?")[0]!)
          const Icon = it.icon
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center justify-center h-[60px] w-[60px] rounded-2xl text-caption transition-all duration-normal",
                  active
                    ? "bg-primary-blue-medium/20 text-primary-blue-vibrant"
                    : "text-neutral-mid-gray hover:bg-neutral-light-gray/50"
                )}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="font-medium">{it.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
