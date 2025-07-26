"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

// Simplified ToggleGroup component that doesn't rely on Radix UI
interface ToggleGroupContextType {
  variant: "default" | "outline"
  size: "default" | "sm" | "lg"
  value: string | string[]
  onValueChange: (value: string | string[]) => void
  disabled: boolean
  type: "single" | "multiple"
}

const ToggleGroupContext = React.createContext<ToggleGroupContextType>({
  variant: "default", 
  size: "default", 
  value: "", 
  onValueChange: () => {}, 
  disabled: false,
  type: "single"
})

interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  disabled?: boolean
  defaultValue?: string | string[]
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ 
    className, 
    variant = "default", 
    size = "default", 
    type = "single", 
    value, 
    onValueChange, 
    disabled = false,
    defaultValue,
    children,
    ...props 
  }, ref) => {
    // Internal state if not controlled
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      type === "single" ? "" : []
    )
  
    // Ensure we always have the correct type for the actual value
    const actualValue = React.useMemo(() => {
      if (value !== undefined) return value
      return internalValue
    }, [value, internalValue])
    
    const handleValueChange = React.useCallback((value: string | string[]) => {
      if (disabled) return
      
      if (type === "single") {
        const itemValue = value as string
        const newValue = actualValue === itemValue ? "" : itemValue
        onValueChange ? onValueChange(newValue) : setInternalValue(newValue)
      } else {
        const itemValue = value as string
        const currentValues = Array.isArray(actualValue) ? actualValue : []
        const newValue = currentValues.includes(itemValue)
          ? currentValues.filter(v => v !== itemValue)
          : [...currentValues, itemValue]
        onValueChange ? onValueChange(newValue) : setInternalValue(newValue)
      }
  }, [actualValue, disabled, onValueChange, type])
    
    return (
      <ToggleGroupContext.Provider
        value={{
          variant,
          size,
          value: actualValue,
          onValueChange: handleValueChange,
          disabled,
          type
        }}
      >
        <div
          ref={ref}
          className={cn("flex items-center gap-1", className)}
          role={type === "single" ? "radiogroup" : "group"}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  }
)

ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, variant, size, value, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    
    const isSelected = React.useMemo(() => {
      if (context.type === 'single') {
        return context.value === value
      } else {
        return Array.isArray(context.value) && context.value.includes(value)
      }
    }, [context.value, value, context.type])

    const handleClick = React.useCallback(() => {
      if (context.type === 'single') {
        // For single selection, pass the value directly
        context.onValueChange(value)
      } else {
        // For multiple selection, handle the toggle logic in the parent
        context.onValueChange(value)
      }
    }, [context, value])

    const buttonProps = {
      ref,
      type: 'button' as const,
      role: context.type === 'single' ? 'radio' : undefined,
      'aria-checked': isSelected,
      'aria-pressed': context.type !== 'single' ? isSelected : undefined,
      'data-state': isSelected ? 'on' : 'off',
      disabled: context.disabled || props.disabled,
      className: cn(
        toggleVariants({
          variant: isSelected ? 'default' : 'outline',
          size: size || context.size,
        }),
        className
      ),
      onClick: handleClick,
      ...props,
    }

    return (
      <button {...buttonProps}>
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
