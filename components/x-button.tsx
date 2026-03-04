import { cn } from "@/lib/utils"

interface XButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "muted" | "destructive"
  size?: "xs" | "sm" | "md" | "lg"
  chamfer?: boolean
  asIcon?: boolean
}

export function XButton({
  variant = "default",
  size = "md",
  chamfer = false,
  asIcon = false,
  className,
  ...props
}: XButtonProps) {
  const sizeClasses = {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-7 w-7",
    lg: "h-8 w-8",
  }

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4.5 w-4.5",
  }

  const variantClasses = {
    default: "text-muted-foreground hover:text-foreground",
    muted: "text-muted-foreground/50 hover:text-muted-foreground",
    destructive: "text-muted-foreground hover:text-destructive",
  }

  const svg = (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("stroke-current", iconSizes[size])}
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M1.5 1.5L10.5 10.5" />
      <path d="M10.5 1.5L1.5 10.5" />
    </svg>
  )

  if (asIcon) {
    return <span className={cn("inline-flex items-center", className)}>{svg}</span>
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {svg}
    </button>
  )
}
