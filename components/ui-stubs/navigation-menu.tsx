"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Stub component to replace @radix-ui/react-navigation-menu
interface NavigationMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

const NavigationMenu = React.forwardRef<HTMLDivElement, NavigationMenuProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative z-10 flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
NavigationMenu.displayName = "NavigationMenu"

interface NavigationMenuListProps extends React.HTMLAttributes<HTMLUListElement> {}

const NavigationMenuList = React.forwardRef<HTMLUListElement, NavigationMenuListProps>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn(
        "group flex flex-1 list-none items-center justify-center space-x-1",
        className
      )}
      {...props}
    />
  )
)
NavigationMenuList.displayName = "NavigationMenuList"

interface NavigationMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {}

const NavigationMenuItem = React.forwardRef<HTMLLIElement, NavigationMenuItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("relative", className)} {...props} />
  )
)
NavigationMenuItem.displayName = "NavigationMenuItem"

interface NavigationMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
NavigationMenuTrigger.displayName = "NavigationMenuTrigger"

interface NavigationMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "absolute left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:w-auto",
        className
      )}
      {...props}
    />
  )
)
NavigationMenuContent.displayName = "NavigationMenuContent"

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent
}
