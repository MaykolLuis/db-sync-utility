"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Simplified Toast system that doesn't rely on Radix UI
const ToastContext = React.createContext<{
  toasts: Array<{
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    variant?: "default" | "destructive"
  }>
  addToast: (toast: {
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    variant?: "default" | "destructive"
  }) => void
  removeToast: (id: string) => void
}>({ 
  toasts: [],
  addToast: () => {},
  removeToast: () => {}
})

interface ToastProviderProps {
  children: React.ReactNode
  swipeDirection?: "right" | "left" | "up" | "down"
  duration?: number
}

const ToastProvider = ({ 
  children, 
  duration = 1000,
  swipeDirection = "right" 
}: ToastProviderProps) => {
  const [toasts, setToasts] = React.useState<Array<{
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    variant?: "default" | "destructive"
  }>>([]);

  const addToast = React.useCallback((toast: {
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    variant?: "default" | "destructive"
  }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, ...toast }]);

    // Auto-dismiss toast after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);

    return id;
  }, [duration]);

  const removeToast = React.useCallback((id: string) => {
    // Immediately remove toast without delay
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

const ToastViewport = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement> & {
    hotkey?: string[]
    label?: string
  }
>(({ className, hotkey, label = "Notifications", ...props }, ref) => {
  const { toasts } = React.useContext(ToastContext);

  return (
    <ol
      ref={ref}
      className={cn(
        "fixed bottom-0 right-0 top-auto z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4 md:max-w-[380px]",
        className
      )}
      {...props}
    >
      {toasts.map((toast) => (
        <li key={toast.id} className="flex">
          <Toast id={toast.id} variant={toast.variant}>
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            {toast.action}
            <ToastClose onClick={() => {
              const { removeToast } = React.useContext(ToastContext);
              removeToast(toast.id);
            }} />
          </Toast>
        </li>
      ))}
    </ol>
  )
})
ToastViewport.displayName = "ToastViewport"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:animate-out data-[state=open]:duration-300",
  {
    variants: {
      variant: {
        default: "border border-[rgba(255,255,255,0.1)] bg-[#121212] text-gray-200",
        destructive: "border border-red-800 bg-[#121212] text-red-300",
        success: "border border-green-800 bg-[#121212] text-green-300",
        info: "border border-blue-800 bg-[#121212] text-blue-300",
        warning: "border border-amber-800 bg-[#121212] text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  id: string
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, id, ...props }, ref) => {
    const { removeToast } = React.useContext(ToastContext);

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), "shadow-lg shadow-black/20 backdrop-blur-sm", className)}
        data-state="open"
        {...props}
      />
    )
  }
)
Toast.displayName = "Toast"

interface ToastActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
        className
      )}
      {...props}
    />
  )
)
ToastAction.displayName = "ToastAction"

interface ToastCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  ({ className, ...props }, ref) => {
    const { removeToast } = React.useContext(ToastContext);
    
    return (
      <button
        ref={ref}
        className={cn(
          "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-100 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
          className
        )}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    )
  }
)
ToastClose.displayName = "ToastClose"

interface ToastTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

const ToastTitle = React.forwardRef<HTMLDivElement, ToastTitleProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm font-semibold [&+div]:text-xs text-blue-300", className)}
      {...props}
    />
  )
)
ToastTitle.displayName = "ToastTitle"

interface ToastDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

const ToastDescription = React.forwardRef<HTMLDivElement, ToastDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm opacity-90 text-gray-300", className)}
      {...props}
    />
  )
)
ToastDescription.displayName = "ToastDescription"

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
