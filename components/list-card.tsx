"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FolderOpen } from 'lucide-react'

export function ListCard({
  id,
  name,
  wordsCount = 0,
  pct = 0,
}: {
  id: string
  name: string
  wordsCount?: number
  pct?: number
}) {
  return (
    <Link href={`/app/lists/${id}`}>
      <Card className="transition hover:border-sky-300">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-sky-50 grid place-items-center">
                <FolderOpen className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <div className="font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">{wordsCount} {"kelime"}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{pct}%</div>
          </div>
          <div className="mt-2">
            <Progress value={pct} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
