import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'warning' | 'error' | 'neutral' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-blue-100 text-blue-600",
      success: "bg-green-100 text-green-600",
      warning: "bg-orange-100 text-orange-600",
      error: "bg-red-100 text-red-600",
      neutral: "bg-slate-100 text-slate-600",
    }
    return (
      <div
        ref={ref}
        className={cn(
          "status-chip",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
