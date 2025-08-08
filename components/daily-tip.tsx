"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Star, Target, Brain, BookOpen, Zap, Heart, Trophy } from 'lucide-react'

interface DailyTipProps {
  totalWords: number
  streak: number
  hasRecentActivity: boolean
}

const LEARNING_TIPS = [
  {
    icon: Brain,
    title: "Tekrar Gücü",
    tip: "Öğrendiğin kelimeleri 24 saat içinde tekrar etmek kalıcılığı %60 artırır!",
    color: "purple",
    bgClass: "from-purple-50 to-pink-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    icon: Target,
    title: "Küçük Hedefler",
    tip: "Günde 5 kelime öğrenmek yılda 1825 kelime demek. Küçük adımlar, büyük başarılar!",
    color: "blue",
    bgClass: "from-blue-50 to-cyan-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  {
    icon: BookOpen,
    title: "Cümle İçinde Öğren",
    tip: "Kelimeleri cümle içinde öğrenmek anlamlarını daha iyi kavramana yardımcı olur.",
    color: "green",
    bgClass: "from-green-50 to-emerald-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600"
  },
  {
    icon: Zap,
    title: "Sabah Enerjisi",
    tip: "Sabah saatleri öğrenme için en verimli zaman. Beynin daha taze ve odaklanmış!",
    color: "orange",
    bgClass: "from-orange-50 to-yellow-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600"
  },
  {
    icon: Heart,
    title: "Sevdiğin Konular",
    tip: "İlgi alanlarınla ilgili kelimeler öğrenmek motivasyonunu artırır ve daha kalıcı olur.",
    color: "red",
    bgClass: "from-red-50 to-pink-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600"
  },
  {
    icon: Trophy,
    title: "Küçük Başarılar",
    tip: "Her öğrendiğin kelimeyi kutla! Küçük başarılar büyük motivasyon yaratır.",
    color: "yellow",
    bgClass: "from-yellow-50 to-orange-50",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600"
  },
  {
    icon: Star,
    title: "Tutarlılık",
    tip: "Her gün 10 dakika çalışmak, haftada 1 gün 2 saat çalışmaktan daha etkilidir.",
    color: "indigo",
    bgClass: "from-indigo-50 to-purple-50",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600"
  }
]

export default function DailyTip({ totalWords, streak, hasRecentActivity }: DailyTipProps) {
  // Get tip based on day of year to ensure it changes daily
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const tipIndex = dayOfYear % LEARNING_TIPS.length
  const tip = LEARNING_TIPS[tipIndex]
  
  // Customize message based on user progress
  const getCustomMessage = () => {
    if (totalWords === 0) {
      return "İlk kelimeni öğrenmeye hazır mısın?"
    }
    
    if (!hasRecentActivity) {
      return "Bugün öğrenme zamanı!"
    }
    
    if (streak >= 7) {
      return `${streak} günlük serin harika! Devam et!`
    }
    
    if (streak >= 3) {
      return `${streak} günlük seri oluşturdun!`
    }
    
    if (totalWords >= 100) {
      return "Muhteşem ilerleme kaydediyorsun!"
    }
    
    if (totalWords >= 50) {
      return "İyi bir yolda ilerliyorsun!"
    }
    
    return "Her gün biraz daha iyiye gidiyorsun!"
  }

  return (
    <Card className={`bg-gradient-to-r ${tip.bgClass} border-opacity-50 hover:shadow-md transition-all duration-300`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${tip.iconBg} flex-shrink-0`}>
            <tip.icon className={`w-5 h-5 ${tip.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-gray-800">Günün İpucu</span>
              <Badge variant="secondary" className="text-xs bg-white/50">
                {tip.title}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
              {tip.tip}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 italic">
                💪 {getCustomMessage()}
              </p>
              <div className="text-xs text-gray-500">
                {new Date().toLocaleDateString('tr-TR', { 
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}