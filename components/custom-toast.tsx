"use client"

import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface CustomToastProps {
  type: ToastType
  title: string
  description?: string
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle
}

const toastColors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    title: 'text-green-900',
    desc: 'text-green-700'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    title: 'text-red-900',
    desc: 'text-red-700'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    desc: 'text-blue-700'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    title: 'text-yellow-900',
    desc: 'text-yellow-700'
  }
}

function CustomToastContent({ type, title, description }: CustomToastProps) {
  const Icon = toastIcons[type]
  const colors = toastColors[type]

  return (
    <div className={`flex items-start space-x-3 p-4 rounded-lg border ${colors.bg} ${colors.border} shadow-lg`}>
      <Icon className={`w-6 h-6 ${colors.icon} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${colors.title}`}>{title}</p>
        {description && (
          <p className={`text-sm ${colors.desc} mt-1`}>{description}</p>
        )}
      </div>
    </div>
  )
}

export const showCustomToast = {
  success: (title: string, description?: string) => {
    toast.custom(() => <CustomToastContent type="success" title={title} description={description} />, {
      duration: 4000,
    })
  },
  error: (title: string, description?: string) => {
    toast.custom(() => <CustomToastContent type="error" title={title} description={description} />, {
      duration: 5000,
    })
  },
  info: (title: string, description?: string) => {
    toast.custom(() => <CustomToastContent type="info" title={title} description={description} />, {
      duration: 4000,
    })
  },
  warning: (title: string, description?: string) => {
    toast.custom(() => <CustomToastContent type="warning" title={title} description={description} />, {
      duration: 4000,
    })
  }
}
