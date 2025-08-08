"use client"

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

export function Donut({ percent = 0, size = 80 }: { percent?: number; size?: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)))
  const circumference = 2 * Math.PI * 35 // radius of 35 for a circle
  const strokeDasharray = `${(p / 100) * circumference} ${circumference}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="35"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="35"
          stroke="rgb(2,132,199)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900"
      >
        {p}%
      </div>
    </div>
  )
}
