"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus, Target, TrendingUp, Play, RefreshCw, Award } from 'lucide-react'
import Link from 'next/link'

interface QuickActionsProps {
  hasWords: boolean
  hasLists: boolean
  hasRecentActivity: boolean
  weeklyTotal: number
  streak: number
}

export default function QuickActions({
  hasWords,
  hasLists,
  hasRecentActivity,
  weeklyTotal,
  streak
}: QuickActionsProps) {
  
  const actions = generateActions({
    hasWords,
    hasLists,
    hasRecentActivity,
    weeklyTotal,
    streak
  })

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Önerilen Adımlar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border hover:bg-muted/100 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background`}>
                <action.icon className={`w-4 h-4 text-muted-foreground`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">{action.title}</span>
                  {action.priority === 'high' && (
                    <Badge className="bg-red-500/10 text-red-500 text-xs">
                      Öncelikli
                    </Badge>
                  )}
                  {action.priority === 'medium' && (
                    <Badge variant="secondary" className="text-xs">
                      Önerilen
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground break-words">{action.description}</p>
              </div>
            </div>
            <Link href={action.href} className="shrink-0 ml-4">
              <Button size="sm">
                {action.buttonText}
              </Button>
            </Link>
          </div>
        ))}
        
        {/* Motivational footer */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg text-center">
          <p className="text-sm text-foreground/80">
            {getMotivationalMessage(weeklyTotal, streak, hasRecentActivity)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function generateActions({
  hasWords,
  hasLists,
  hasRecentActivity,
  weeklyTotal,
  streak
}: {
  hasWords: boolean
  hasLists: boolean
  hasRecentActivity: boolean
  weeklyTotal: number
  streak: number
}) {
  const actions = []

  // Priority 1: If no lists exist, suggest creating one
  if (!hasLists) {
    actions.push({
      icon: Plus,
      title: "İlk Listeni Oluştur",
      description: "Kelime öğrenmeye başlamak için bir liste oluştur",
      href: "/app/lists",
      buttonText: "Oluştur",
      priority: 'high',
    })
  }
  
  // Priority 2: If no recent activity, suggest learning
  else if (!hasRecentActivity) {
    actions.push({
      icon: BookOpen,
      title: "Öğrenmeye Başla",
      description: "Bugün henüz kelime öğrenmedin. Hadi başlayalım!",
      href: "/app/learn",
      buttonText: "Başla",
      priority: 'high',
    })
  }
  
  // Priority 3: If low weekly total, suggest more practice
  else if (weeklyTotal < 10) {
    actions.push({
      icon: TrendingUp,
      title: "Daha Fazla Pratik Yap",
      description: "Bu hafta daha fazla kelime öğrenerek hedefini aş",
      href: "/app/learn",
      buttonText: "Öğren",
      priority: 'medium',
    })
  }
  
  // Priority 4: If no streak, suggest daily practice
  else if (streak === 0) {
    actions.push({
      icon: Target,
      title: "Günlük Seri Başlat",
      description: "Her gün biraz çalışarak seri oluştur",
      href: "/app/learn",
      buttonText: "Başla",
      priority: 'medium',
    })
  }
  
  // Priority 5: If doing well, suggest review
  else {
    actions.push({
      icon: RefreshCw,
      title: "Öğrendiklerini Pekiştir",
      description: "Daha önce öğrendiğin kelimeleri tekrar et",
      href: "/app/learn/review",
      buttonText: "Tekrar Et",
      priority: 'medium',
    })
  }

  // Always suggest setting goals if doing well
  if (hasWords && hasLists) {
    actions.push({
      icon: Target,
      title: "Hedef Belirle",
      description: "Günlük veya haftalık hedeflerini ayarla",
      href: "/app/stats?tab=goals",
      buttonText: "Ayarla",
      priority: 'low',
    })
  }

  // Limit to 3 actions max to avoid overwhelming
  return actions.slice(0, 3)
}

function getMotivationalMessage(weeklyTotal: number, streak: number, hasRecentActivity: boolean): string {
  if (weeklyTotal === 0) {
    return "🌟 Her büyük yolculuk tek bir adımla başlar. Hadi ilk kelimeni öğren!"
  }
  
  if (!hasRecentActivity) {
    return "💪 Dün harika işler çıkardın, bugün de devam et!"
  }
  
  if (streak >= 7) {
    return `🔥 ${streak} günlük serin muhteşem! Bu momentum'u kaybetme!`
  }
  
  if (streak >= 3) {
    return `⚡ ${streak} günlük seri oluşturdun. Devam et!`
  }
  
  if (weeklyTotal >= 20) {
    return "🎉 Bu hafta harika performans sergiliyorsun! Böyle devam!"
  }
  
  if (weeklyTotal >= 10) {
    return "👏 İyi bir hafta geçiriyorsun. Biraz daha gaza bas!"
  }
  
  return "🚀 Her gün biraz daha ilerliyorsun. Harika iş çıkarıyorsun!"
}