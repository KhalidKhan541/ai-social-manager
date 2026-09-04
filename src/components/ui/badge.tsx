import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn, platformColors, type Platform } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-100 text-green-800",
        warning: "border-transparent bg-yellow-100 text-yellow-800",
        info: "border-transparent bg-blue-100 text-blue-800",
      },
      platform: {
        twitter: "border-transparent bg-sky-100 text-sky-700",
        facebook: "border-transparent bg-blue-100 text-blue-700",
        instagram: "border-transparent bg-pink-100 text-pink-700",
        linkedin: "border-transparent bg-indigo-100 text-indigo-700",
        youtube: "border-transparent bg-red-100 text-red-700",
        tiktok: "border-transparent bg-gray-100 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  platform?: Platform
  removable?: boolean
  onRemove?: () => void
  icon?: React.ReactNode
}

function Badge({
  className,
  variant,
  platform,
  removable,
  onRemove,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant: platform ? undefined : variant }),
        platform && cn(platformColors[platform].bg, platformColors[platform].text),
        className
      )}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          className="ml-1 rounded-full p-0.5 hover:bg-black/10"
          onClick={onRemove}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span className="sr-only">Remove</span>
        </button>
      )}
    </div>
  )
}

export { Badge, badgeVariants }