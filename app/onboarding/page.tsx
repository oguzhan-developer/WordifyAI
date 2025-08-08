"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronRight, BookOpen, Brain, Sparkles, Target, Users, TrendingUp } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      icon: BookOpen,
      title: "Kelime Hazineni Keşfet",
      description: "Binlerce kelime ile vocabulary'ni geliştir. İngilizce kelime öğrenmeyi hiç bu kadar eğlenceli hissetmedin!",
      visual: (
        <div className="relative">
          <div className="grid grid-cols-2 gap-2">
            {['vocabulary', 'amazing', 'brilliant', 'adventure'].map((word, i) => (
              <div 
                key={word}
                className={`p-3 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 text-center transition-all duration-500`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className="text-white font-medium text-sm">{word}</div>
                <div className="text-blue-100 text-xs mt-1">
                  {i === 0 ? 'kelime hazinesi' : i === 1 ? 'harika' : i === 2 ? 'parlak' : 'macera'}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute -top-2 -right-2 text-yellow-300 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      )
    },
    {
      icon: Brain,
      title: "Yapay Zeka ile Kişisel Öğrenme",
      description: "AI teknolojisi ile seviyene uygun kelimeler öner, öğrenme hızını takip et ve güçlü yanlarını keşfet.",
      visual: (
        <div className="relative">
          <div className="w-32 h-32 mx-auto relative">
            {/* AI Brain visualization */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 opacity-20 animate-pulse"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-700 opacity-30 animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-800 opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
            
            {/* Neural connections */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-12 h-12 text-white animate-bounce" style={{animationDelay: '1.5s'}} />
            </div>
            
            {/* Floating AI elements */}
            <div className="absolute top-0 right-4 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
            <div className="absolute bottom-4 left-0 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.8s'}}></div>
            <div className="absolute top-8 left-2 w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '1.2s'}}></div>
          </div>
        </div>
      )
    },
    {
      icon: Target,
      title: "Hedeflerin Doğrultusunda İlerle",
      description: "Günlük hedefler koy, ilerlemeni takip et ve başarılarını kutla. Her gün biraz daha güçlen!",
      visual: (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
            <span className="text-white text-sm">Günlük Hedef</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="w-4/5 h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-white text-xs">8/10</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
            <span className="text-white text-sm">Haftalık Seri</span>
            <div className="flex space-x-1">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full ${i < 5 ? 'bg-green-400' : 'bg-white/30'} transition-all duration-300`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
          <div className="text-center p-2">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto animate-bounce" />
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Save onboarding completion
      localStorage.setItem("vocab_app_onboarding_completed", "true")
      router.replace("/login")
    }
  }

  const handleSkip = () => {
    localStorage.setItem("vocab_app_onboarding_completed", "true")
    router.replace("/login")
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">WordifyAI</span>
        </div>
        <Button 
          variant="ghost" 
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleSkip}
        >
          Geç
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 mb-8">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                index <= currentStep ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 flex flex-col items-center justify-center text-center space-y-8">
        {/* Visual Element */}
        <div className="w-full max-w-sm">
          {steps[currentStep].visual}
        </div>

        {/* Text Content */}
        <div className="space-y-4 max-w-sm">
          <div className="flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto">
            {(() => {
              const IconComponent = steps[currentStep].icon
              return <IconComponent className="w-8 h-8 text-white" />
            })()}
          </div>
          
          <h1 className="text-2xl font-bold text-white leading-tight">
            {steps[currentStep].title}
          </h1>
          
          <p className="text-blue-100 leading-relaxed">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 space-y-4">
        <Button 
          className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold py-3 rounded-xl shadow-lg"
          onClick={handleNext}
        >
          {currentStep === steps.length - 1 ? 'Başlayalım' : 'Devam Et'}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
        
        {/* Step indicator */}
        <div className="text-center text-blue-200 text-sm">
          {currentStep + 1} / {steps.length}
        </div>
      </div>
    </div>
  )
}
