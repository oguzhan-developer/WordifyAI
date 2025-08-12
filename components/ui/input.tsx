import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full rounded-[var(--radius-input)] border-2 border-transparent bg-input px-4 py-3 text-base transition-all duration-250 ease-in-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_rgba(74,127,219,0.1)] disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:bg-red-500/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
