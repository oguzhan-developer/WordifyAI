"use client"

import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'

export function MiniBars({ values = [], labels = [] as string[] }: { values?: number[]; labels?: string[] }) {
  const data = values.map((v, i) => ({
    id: labels[i] || `V${i + 1}`,
    value: v,
  }))

  return (
    <div className="h-16">
      <ResponsiveBar
        data={data}
        keys={['value']}
        indexBy="id"
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        padding={0.3}
        colors={{ scheme: 'blues' }}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        enableGridY={false}
        enableLabel={false}
        animate={true}
        aria-label="Mini bar chart"
      />
    </div>
  )
}

export function Donut({ percent = 0, size = 80, className = "", showLabel = true }: { percent?: number; size?: number; className?: string; showLabel?: boolean }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)))
  const data = [
    { id: 'progress', value: p },
    { id: 'remaining', value: 100 - p },
  ]

  const getColorByPercent = (value: number) => {
    if (value < 25) return "#ef4444" // red-500
    if (value < 50) return "#f59e0b" // amber-500
    if (value < 75) return "#3b82f6" // blue-500
    return "#10b981" // emerald-500
  }
  const progressColor = getColorByPercent(p)
  const trackColor = "#e5e7eb" // gray-200

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <ResponsivePie
        data={data}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        innerRadius={0.7}
        padAngle={0}
        cornerRadius={0}
        activeOuterRadiusOffset={4}
        colors={[progressColor, trackColor]}
        borderWidth={0}
        enableArcLabels={false}
        enableArcLinkLabels={false}
      />
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold" style={{ color: progressColor }}>
          {p}%
        </div>
      )}
    </div>
  )
}

export function EnhancedStatsChart({ values = [], labels = [] }: { values?: number[]; labels?: string[] }) {
  const data = values.map((value, index) => ({
    day: labels[index] || `Gün ${index + 1}`,
    value: value,
  }))

  return (
    <div className="w-full h-48">
      <ResponsiveBar
        data={data}
        keys={['value']}
        indexBy="day"
        margin={{ top: 20, right: 30, bottom: 60, left: 40 }}
        padding={0.4}
        colors={({ id, data }) => data.day === 'Bugün' ? '#3b82f6' : '#60a5fa'}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendPosition: 'middle',
          legendOffset: 50,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Öğrenilen Kelime',
          legendPosition: 'middle',
          legendOffset: -30,
        }}
        enableGridY={true}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        animate={true}
        tooltip={({ id, value, color }) => (
            <div
                style={{
                    padding: '6px 9px',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '3px'
                }}
            >
                <strong style={{ color }}>{value} kelime</strong>
            </div>
        )}
      />
    </div>
  )
}
