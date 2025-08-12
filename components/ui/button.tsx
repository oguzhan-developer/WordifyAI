import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] text-base font-semibold transition-all duration-250 ease-in-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary-blue-medium to-primary-blue-light text-white shadow-[var(--shadow-colored)] hover:translate-y-[-2px] hover:shadow-[var(--shadow-glow)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-2 border-primary bg-white/90 text-primary hover:bg-primary hover:text-white",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "bg-white/15 backdrop-blur-lg text-white border border-white/30 hover:bg-white/25",
      },
      size: {
        default: "px-6 py-3 text-base", // md
        sm: "px-4 py-2 text-sm",
        lg: "px-8 py-4 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
