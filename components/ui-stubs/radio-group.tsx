"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
  name?: string
  required?: boolean
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, value: propValue, onValueChange, defaultValue, disabled = false, name, required, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '')
    const value = propValue !== undefined ? propValue : internalValue

    const handleChange = (newValue: string) => {
      if (disabled) return
      if (propValue === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    }

    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement<RadioGroupItemProps>(child)) {
        const childProps = child.props as RadioGroupItemProps;
        return React.cloneElement(child, {
          checked: value === childProps.value,
          onValueChange: handleChange,
          disabled: disabled || childProps.disabled,
          name,
          required,
          // Preserve other props
          ...childProps
        });
      }
      return child;
    });

    return (
      <div 
        ref={ref} 
        className={cn("grid gap-2", className)} 
        role="radiogroup"
        aria-required={required}
        {...props}
      >
        {childrenWithProps}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string
  disabled?: boolean
  checked?: boolean
  onValueChange?: (value: string) => void
  name?: string
  required?: boolean
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, children, value, disabled = false, checked = false, onValueChange, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onValueChange) {
        onValueChange(value)
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
