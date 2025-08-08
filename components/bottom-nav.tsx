"use client"

import Link from "next/link"
import { Home, List, PlayCircle, BarChart3, User } from 'lucide-react'
import { cn } from "@/lib/utils"

export function BottomNav({ activePath = "/app" }: { activePath?: string }) {
  const items = [
    { href: "/app", label: "Ana Sayfa", icon: Home },
    { href: "/app/lists", label: "Listeler", icon: List },
    // Route to the selector first
    { href: "/app/learn/select-list", label: "Öğren", icon: PlayCircle },
    { href: "/app/stats", label: "İstatistikler", icon: BarChart3 },
    { href: "/app/profile", label: "Profil", icon: User },
  ]

  return (
    <nav aria-label="Alt menü" className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
        {items.map((it) => {
          const active = activePath.startsWith(it.href.split("?")[0]!)
          const Icon = it.icon
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center px-3 py-1 rounded-md text-[11px]",
                  active ? "text-sky-700" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 mb-0.5", active && "text-sky-700")} />
                <span>{it.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
