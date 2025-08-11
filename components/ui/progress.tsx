"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressRingProps extends React.SVGProps<SVGSVGElement> {
  value: number;
}

const ProgressRing = React.forwardRef<SVGSVGElement, ProgressRingProps>(
  ({ className, value, ...props }, ref) => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn("transform -rotate-90", className)}
        {...props}
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary-pink-medium)" />
            <stop offset="100%" stopColor="var(--primary-blue-medium)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="rgba(74, 127, 219, 0.1)"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          className="transform rotate-90"
          style={{
            fontSize: '28px',
            fontWeight: 700,
            fill: 'var(--primary-blue-dark)',
          }}
        >
          {`${Math.round(value)}%`}
        </text>
      </svg>
    )
  }
)
ProgressRing.displayName = "ProgressRing"

// Keep the original linear Progress component for other potential uses, but rename it.
import * as ProgressPrimitive from "@radix-ui/react-progress"

const LinearProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
LinearProgress.displayName = ProgressPrimitive.Root.displayName

export { ProgressRing, LinearProgress as Progress }
