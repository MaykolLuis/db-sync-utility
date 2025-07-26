"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified Tooltip component that doesn't rely on Radix UI
const TooltipContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  content: React.ReactNode
  setContent: React.Dispatch<React.SetStateAction<React.ReactNode>>
  triggerRef: React.RefObject<HTMLElement | null>
}>({ 
  open: false, 
  setOpen: () => {}, 
  content: null, 
  setContent: () => {},
  triggerRef: { current: null }
})

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}

const TooltipProvider = ({ 
  children,
  delayDuration = 700, 
  skipDelayDuration = 300 
}: TooltipProviderProps) => {
  const [open, setOpen] = React.useState(false)
  const [content, setContent] = React.useState<React.ReactNode>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  return (
    <TooltipContext.Provider value={{ open, setOpen, content, setContent, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  )
}

interface TooltipProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Tooltip = ({ children }: TooltipProps) => {
  return <>{children}</>
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
  children: React.ReactNode
}

interface TooltipTriggerElement extends React.HTMLAttributes<HTMLElement> {
  ref?: React.Ref<HTMLElement>;
}

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ asChild, children, ...props }, forwardedRef) => {
    const { setOpen, triggerRef } = React.useContext(TooltipContext)
    const internalRef = React.useRef<HTMLElement>(null)
    const ref = React.useRef<HTMLElement | null>(null)

    // Combine forwarded ref and internal ref
    React.useEffect(() => {
      if (!forwardedRef) return
      
      if (typeof forwardedRef === 'function') {
        forwardedRef(ref.current)
      } else {
        ;(forwardedRef as React.MutableRefObject<HTMLElement | null>).current = ref.current
      }
    }, [forwardedRef])

    const handleMouseEnter = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
      // Call the original onMouseEnter if it exists
      if (props.onMouseEnter) {
        props.onMouseEnter(e)
      }
      setOpen(true)
    }, [setOpen, props.onMouseEnter])

    const handleMouseLeave = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
      // Call the original onMouseLeave if it exists
      if (props.onMouseLeave) {
        props.onMouseLeave(e)
      }
      setOpen(false)
    }, [setOpen, props.onMouseLeave])

    // Clone the child element to add event handlers
    if (React.isValidElement(children)) {
      const childProps: TooltipTriggerElement = {
        ...props,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }

      // Handle ref forwarding
      const { ref: childRef } = children as { ref?: React.Ref<HTMLElement> }
      
      if (childRef) {
        if (typeof childRef === 'function') {
          childProps.ref = (node: HTMLElement | null) => {
            ref.current = node
            childRef(node)
          }
        } else {
          childProps.ref = (node: HTMLElement | null) => {
            ref.current = node
            ;(childRef as React.MutableRefObject<HTMLElement | null>).current = node
          }
        }
      } else {
        childProps.ref = (node: HTMLElement | null) => {
          ref.current = node
          triggerRef.current = node
        }
      }

      return React.cloneElement(children, childProps)
    }

    // Fallback to a span if children is not a valid element
    return (
      <span 
        ref={ref as React.Ref<HTMLSpanElement>} 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave} 
        {...props}
      >
        {children}
      </span>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 4, children, ...props }, ref) => {
    const { open, setContent, triggerRef } = React.useContext(TooltipContext)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })
    
    React.useEffect(() => {
      setContent(children)
    }, [children, setContent])

    React.useEffect(() => {
      if (open && triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        // Estimate tooltip dimensions (we'll use approximate values)
        const tooltipWidth = 320 // w-80 = 320px
        const tooltipHeight = 200 // approximate height
        
        // Calculate initial position (centered below trigger)
        let top = triggerRect.bottom + scrollTop + sideOffset
        let left = triggerRect.left + scrollLeft + (triggerRect.width / 2)
        
        // Check right boundary - if tooltip would go off-screen, align to right edge of trigger
        if (left + (tooltipWidth / 2) > viewportWidth + scrollLeft) {
          left = triggerRect.right + scrollLeft - tooltipWidth
        }
        
        // Check left boundary - if tooltip would go off-screen, align to left edge of trigger
        if (left - (tooltipWidth / 2) < scrollLeft) {
          left = triggerRect.left + scrollLeft
        }
        
        // Check bottom boundary - if tooltip would go off-screen, position above trigger
        if (top + tooltipHeight > viewportHeight + scrollTop) {
          top = triggerRect.top + scrollTop - tooltipHeight - sideOffset
        }
        
        // Ensure tooltip doesn't go above viewport
        if (top < scrollTop) {
          top = triggerRect.bottom + scrollTop + sideOffset
        }
        
        setPosition({ top, left })
      }
    }, [open, sideOffset, triggerRef])

    if (!open) return null

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "z-50 fixed overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
