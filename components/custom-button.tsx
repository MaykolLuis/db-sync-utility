"use client"

import React from "react"
import { Button as UIButton, type ButtonProps, buttonVariants } from "./ui/button"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"

// Create a custom Button component that explicitly handles variant and size props
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "bfi"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "CustomButton"

export { Button, type CustomButtonProps }
