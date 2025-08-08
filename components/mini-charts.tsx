"use client"

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export function MiniBars({ values = [], labels = [] as string[] }: { values?: number[]; labels?: string[] }) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex items-end gap-2 h-16">
      {values.map((v, i) => {
        const h = Math.round((v / max) * 100)
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-5 bg-sky-200 rounded-sm" style={{ height: `${h}%` }} />
            {labels[i] && <div className="text-[10px] text-muted-foreground">{labels[i]}</div>}
          </div>
        )
      })}
    </div>
  )
}

export function Donut({ percent = 0, size = 80, className = "", showLabel = true }: { percent?: number; size?: number; className?: string; showLabel?: boolean }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)))
  const strokeWidth = 8
  const radius = Math.max(1, size / 2 - strokeWidth)
  const circumference = 2 * Math.PI * radius
  const dash = (p / 100) * circumference

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900">
          {p}%
        </div>
      )}
    </div>
  )
}

// Enhanced stats chart using Recharts for better visualization
export function EnhancedStatsChart({ values = [], labels = [] }: { values?: number[]; labels?: string[] }) {
  const data = values.map((value, index) => ({
    name: labels[index] || `Gün ${index + 1}`,
    value: value,
    isToday: index === values.length - 1
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-blue-600">
            <span className="font-semibold">{payload[0].value}</span> kelime öğrenildi
          </p>
        </div>
      )
    }
    return null
  }

  const CustomBar = (props: any) => {
    const { fill, payload, ...rest } = props
    const isToday = payload?.isToday
    const isActive = payload?.value > 0
    
    let barFill = '#e2e8f0' // gray-300 for empty days
    if (isActive && isToday) {
      barFill = '#3b82f6' // blue-500 for today with activity
    } else if (isActive) {
      barFill = '#60a5fa' // blue-400 for other active days
    }
    
    return <Bar {...rest} fill={barFill} radius={[2, 2, 0, 0]} />
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            shape={<CustomBar />}
            className="hover:opacity-80 transition-opacity"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
