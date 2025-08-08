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
  const p = Math.max(0, Math.min(100, percent))
  const bg = `conic-gradient(rgb(2,132,199) ${p * 3.6}deg, hsl(var(--muted)) 0deg)`
  return (
    <div
      className="rounded-full grid place-items-center"
      style={{
        width: size,
        height: size,
        background: bg,
      }}
      aria-label="Yüzde ilerleme"
    >
      <div className="rounded-full bg-background" style={{ width: size - 18, height: size - 18 }}>
        <div className="h-full grid place-items-center text-xs font-medium">{p}%</div>
      </div>
    </div>
  )
}
