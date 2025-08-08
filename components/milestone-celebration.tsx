"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Star, Target, Flame, PartyPopper, Gift, Crown, Medal } from 'lucide-react'

interface MilestoneCelebrationProps {
  totalWords: number
  streak: number
  totalLists: number
  isVisible: boolean
  onDismiss?: () => void
}

const MILESTONES = [
  { words: 1, title: "İlk Adım", message: "Tebrikler! İlk kelimeni öğrendin! 🎉", icon: Star, color: "blue" },
  { words: 5, title: "Başlangıç", message: "Harika! 5 kelime öğrendin! Devam et! 🌟", icon: Target, color: "green" },
  { words: 10, title: "On'lu Kulüp", message: "Muhteşem! 10 kelimelik kulübe hoş geldin! 🎯", icon: Trophy, color: "purple" },
  { words: 25, title: "Çeyrek Yüz", message: "İnanılmaz! 25 kelime öğrendin! 🚀", icon: Medal, color: "orange" },
  { words: 50, title: "Yarım Yüz", message: "Fantastik! 50 kelime tamamlandı! 🏆", icon: Crown, color: "red" },
  { words: 100, title: "Yüzlük", message: "Efsane! 100 kelime öğrendin! Sen bir şampiyon! 👑", icon: PartyPopper, color: "yellow" },
  { words: 250, title: "Çeyrek Bin", message: "İnanılmaz başarı! 250 kelime! 🌟✨", icon: Gift, color: "indigo" },
  { words: 500, title: "Beş Yüz", message: "Muazzam! 500 kelimelik hazine! 💎", icon: Trophy, color: "pink" },
  { words: 1000, title: "Binlik", message: "Efsanevi başarı! 1000 kelime! Sen bir dil ustası! 🎊", icon: Crown, color: "gradient" }
]

const STREAK_MILESTONES = [
  { streak: 3, title: "Üç Gün", message: "3 günlük seri! Harika başlangıç! 🔥", icon: Flame, color: "orange" },
  { streak: 7, title: "Bir Hafta", message: "1 haftalık seri! Tutarlılığın harika! 📅", icon: Target, color: "green" },
  { streak: 14, title: "İki Hafta", message: "2 haftalık seri! Disiplinin mükemmel! ⚡", icon: Trophy, color: "blue" },
  { streak: 30, title: "Bir Ay", message: "30 günlük seri! Sen bir efsane! 🏆", icon: Crown, color: "purple" },
  { streak: 100, title: "Yüz Gün", message: "100 günlük seri! İnanılmaz kararlılık! 👑", icon: PartyPopper, color: "gradient" }
]

export default function MilestoneCelebration({ 
  totalWords, 
  streak, 
  totalLists, 
  isVisible, 
  onDismiss 
}: MilestoneCelebrationProps) {
  
  // Check for word milestones
  const wordMilestone = MILESTONES.find(m => m.words === totalWords)
  
  // Check for streak milestones
  const streakMilestone = STREAK_MILESTONES.find(m => m.streak === streak)
  
  const milestone = wordMilestone || streakMilestone
  
  if (!milestone || !isVisible) return null

  const getColorClasses = (color: string) => {
    const colors = {
      blue: { bg: "from-blue-50 to-cyan-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600" },
      green: { bg: "from-green-50 to-emerald-50", border: "border-green-200", icon: "bg-green-100 text-green-600" },
      purple: { bg: "from-purple-50 to-pink-50", border: "border-purple-200", icon: "bg-purple-100 text-purple-600" },
      orange: { bg: "from-orange-50 to-yellow-50", border: "border-orange-200", icon: "bg-orange-100 text-orange-600" },
      red: { bg: "from-red-50 to-pink-50", border: "border-red-200", icon: "bg-red-100 text-red-600" },
      yellow: { bg: "from-yellow-50 to-orange-50", border: "border-yellow-200", icon: "bg-yellow-100 text-yellow-600" },
      indigo: { bg: "from-indigo-50 to-purple-50", border: "border-indigo-200", icon: "bg-indigo-100 text-indigo-600" },
      pink: { bg: "from-pink-50 to-rose-50", border: "border-pink-200", icon: "bg-pink-100 text-pink-600" },
      gradient: { bg: "from-purple-50 via-pink-50 to-yellow-50", border: "border-purple-200", icon: "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600" }
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const colorClasses = getColorClasses(milestone.color)

  return (
    <Card className={`bg-gradient-to-r ${colorClasses.bg} ${colorClasses.border} shadow-lg hover:shadow-xl transition-all duration-500 animate-in slide-in-from-top-4`}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          {/* Celebration Icon */}
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${colorClasses.icon} shadow-lg`}>
              <milestone.icon className="w-8 h-8" />
            </div>
          </div>
          
          {/* Title and Badge */}
          <div className="space-y-2">
            <Badge className="bg-white/80 text-gray-800 px-3 py-1 text-sm font-semibold">
              🎉 {milestone.title}
            </Badge>
            <h3 className="text-xl font-bold text-gray-800">
              {milestone.message}
            </h3>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>{totalWords} kelime</span>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4" />
                <span>{streak} gün seri</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{totalLists} liste</span>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="pt-2">
            <Button 
              onClick={onDismiss}
              className="bg-white/90 text-gray-700 hover:bg-white hover:text-gray-800 shadow-md"
              size="sm"
            >
              Devam Et! 🚀
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook to check for new milestones
export function useMilestoneCheck(totalWords: number, streak: number) {
  const checkForMilestone = () => {
    const wordMilestone = MILESTONES.find(m => m.words === totalWords)
    const streakMilestone = STREAK_MILESTONES.find(m => m.streak === streak)
    
    return {
      hasMilestone: !!(wordMilestone || streakMilestone),
      milestone: wordMilestone || streakMilestone || null
    }
  }
  
  return checkForMilestone()
}