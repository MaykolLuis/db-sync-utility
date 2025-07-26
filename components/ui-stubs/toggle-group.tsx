"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Stub component to replace @radix-ui/react-toggle-group
interface ToggleGroupItemElement extends React.ReactElement<ToggleGroupItemProps> {
  props: ToggleGroupItemProps;
}

interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, type = "single", value, onValueChange, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center gap-1", className)}
        role={type === "single" ? "radiogroup" : "group"}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement<ToggleGroupItemProps>(child)) {
            const itemValue = child.props.value;
            const isSelected = type === "single"
              ? value === itemValue
              : Array.isArray(value) && value.includes(itemValue);

            return React.cloneElement(child, {
              onClick: () => {
                if (type === "single") {
                  onValueChange?.(itemValue);
                } else {
                  const currentValues = Array.isArray(value) ? [...value] : [];
                  const newValue = currentValues.includes(itemValue)
                    ? currentValues.filter(v => v !== itemValue)
                    : [...currentValues, itemValue];
                  onValueChange?.(newValue);
                }
              },
              'data-state': isSelected ? 'on' : 'off',
              'aria-pressed': type !== 'single' ? isSelected : undefined,
              'aria-checked': type === 'single' ? isSelected : undefined,
              role: type === 'single' ? 'radio' : 'button'
            });
          }
          return child;
        })}
      </div>
    );
  }
)
ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  'data-state'?: 'on' | 'off'
  'aria-pressed'?: boolean
  'aria-checked'?: boolean
  role?: 'radio' | 'button'
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, ...props }, ref) => (
    <button
      ref={ref}
      value={value}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
)
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
