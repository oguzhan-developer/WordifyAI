"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, Target, Zap, Award, BookOpen, Brain, Star } from 'lucide-react'

interface StatsInsightsProps {
  weeklyTotal: number
  dailyCounts: number[]
  totalWords: number
  totalLists: number
  hasAnyActivity: boolean
}

export default function StatsInsights({ 
  weeklyTotal, 
  dailyCounts, 
  totalWords, 
  totalLists, 
  hasAnyActivity 
}: StatsInsightsProps) {
  
  // Calculate insights
  const activeDays = dailyCounts.filter(count => count > 0).length
  const averageDaily = activeDays > 0 ? Math.round(weeklyTotal / activeDays) : 0
  const bestDay = Math.max(...dailyCounts)
  const consistency = Math.round((activeDays / 7) * 100)
  const streak = calculateStreak(dailyCounts)
  
  // Generate motivational insights
  const insights = generateInsights({
    weeklyTotal,
    activeDays,
    averageDaily,
    bestDay,
    consistency,
    streak,
    totalWords,
    totalLists
  })

  if (!hasAnyActivity) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Harika bir başlangıç için hazır mısın?</h3>
          <p className="text-gray-600 text-sm mb-4">
            İlk kelimeni öğrendiğinde burada kişiselleştirilmiş istatistikler ve motivasyon mesajları göreceksin!
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-indigo-600">
            <Star className="w-4 h-4" />
            <span>Öğrenme yolculuğun başlamak üzere</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <Card key={index} className={`${insight.bgClass} ${insight.borderClass} hover:shadow-md transition-shadow`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${insight.iconBg}`}>
                <insight.icon className={`w-5 h-5 ${insight.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  {insight.badge && (
                    <Badge variant="secondary" className={insight.badgeClass}>
                      {insight.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{insight.description}</p>
                {insight.tip && (
                  <p className="text-xs text-gray-500 mt-2 italic">💡 {insight.tip}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function calculateStreak(dailyCounts: number[]): number {
  let streak = 0
  for (let i = dailyCounts.length - 1; i >= 0; i--) {
    if (dailyCounts[i] > 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function generateInsights({
  weeklyTotal,
  activeDays,
  averageDaily,
  bestDay,
  consistency,
  streak,
  totalWords,
  totalLists
}: {
  weeklyTotal: number
  activeDays: number
  averageDaily: number
  bestDay: number
  consistency: number
  streak: number
  totalWords: number
  totalLists: number
}) {
  const insights = []

  // Weekly performance insight
  if (weeklyTotal > 0) {
    if (weeklyTotal >= 20) {
      insights.push({
        icon: TrendingUp,
        title: "Muhteşem Hafta!",
        description: `Bu hafta ${weeklyTotal} kelime öğrendin. Bu harika bir performans!`,
        badge: "Süper",
        bgClass: "bg-gradient-to-br from-green-50 to-emerald-50",
        borderClass: "border-green-200",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        badgeClass: "bg-green-100 text-green-800",
        tip: "Bu tempoyu korumaya devam et!"
      })
    } else if (weeklyTotal >= 10) {
      insights.push({
        icon: Target,
        title: "İyi Bir Hafta",
        description: `${weeklyTotal} kelime öğrenerek güzel bir ilerleme kaydettiniz.`,
        badge: "İyi",
        bgClass: "bg-gradient-to-br from-blue-50 to-cyan-50",
        borderClass: "border-blue-200",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        badgeClass: "bg-blue-100 text-blue-800",
        tip: "Günlük hedefi biraz artırabilirsin!"
      })
    } else {
      insights.push({
        icon: BookOpen,
        title: "Başlangıç Yapıldı",
        description: `${weeklyTotal} kelime ile başlangıç yaptın. Her adım önemli!`,
        badge: "Başlangıç",
        bgClass: "bg-gradient-to-br from-yellow-50 to-orange-50",
        borderClass: "border-yellow-200",
        iconBg: "bg-yellow-100",
        iconColor: "text-yellow-600",
        badgeClass: "bg-yellow-100 text-yellow-800",
        tip: "Düzenli çalışma en önemli faktör."
      })
    }
  }

  // Consistency insight
  if (activeDays > 0) {
    if (consistency >= 80) {
      insights.push({
        icon: Calendar,
        title: "Süper Tutarlılık",
        description: `7 günün ${activeDays}'inde aktiftin. %${consistency} tutarlılık oranı!`,
        badge: "Tutarlı",
        bgClass: "bg-gradient-to-br from-purple-50 to-pink-50",
        borderClass: "border-purple-200",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        badgeClass: "bg-purple-100 text-purple-800",
        tip: "Bu tutarlılık seni başarıya götürecek!"
      })
    } else if (consistency >= 50) {
      insights.push({
        icon: Calendar,
        title: "Gelişen Tutarlılık",
        description: `${activeDays} gün aktiftin. Tutarlılığını artırmaya devam et.`,
        badge: "Gelişiyor",
        bgClass: "bg-gradient-to-br from-indigo-50 to-blue-50",
        borderClass: "border-indigo-200",
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        badgeClass: "bg-indigo-100 text-indigo-800",
        tip: "Her gün biraz çalışmak büyük fark yaratır."
      })
    }
  }

  // Best day insight
  if (bestDay > 5) {
    insights.push({
      icon: Award,
      title: "En İyi Gün Rekoru",
      description: `Tek günde ${bestDay} kelime öğrenerek kişisel rekoru kırdın!`,
      badge: "Rekor",
      bgClass: "bg-gradient-to-br from-orange-50 to-red-50",
      borderClass: "border-orange-200",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      badgeClass: "bg-orange-100 text-orange-800",
      tip: "Bu enerjini sürdürmeye çalış!"
    })
  }

  // Streak insight
  if (streak >= 3) {
    insights.push({
      icon: Zap,
      title: `${streak} Günlük Seri`,
      description: `Art arda ${streak} gün öğrenme yaparak harika bir seri oluşturdun!`,
      badge: "Seri",
      bgClass: "bg-gradient-to-br from-teal-50 to-green-50",
      borderClass: "border-teal-200",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      badgeClass: "bg-teal-100 text-teal-800",
      tip: "Seriyi bozmamaya odaklan!"
    })
  }

  // Average performance insight
  if (averageDaily > 0) {
    insights.push({
      icon: Brain,
      title: "Günlük Ortalama",
      description: `Aktif olduğun günlerde ortalama ${averageDaily} kelime öğreniyorsun.`,
      bgClass: "bg-gradient-to-br from-gray-50 to-slate-50",
      borderClass: "border-gray-200",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
      tip: averageDaily < 3 ? "Günlük hedefi biraz artırabilirsin." : "Harika bir ortalama!"
    })
  }

  return insights.slice(0, 3) // Show max 3 insights to avoid clutter
}