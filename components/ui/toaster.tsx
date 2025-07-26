"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import React from "react";

export function Toaster() {
  const { toasts, dismiss } = useToast()

  // Auto-dismiss toast after 1 second
  React.useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        toasts.forEach(toast => dismiss(toast.id));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [toasts, dismiss]);

  return (
    <ToastProvider>
      <div className="fixed bottom-16 right-4 flex flex-col-reverse gap-2 z-[100]">
        {toasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <div 
              key={id}
              className="animate-slide-in-from-right max-w-xs p-3 text-sm bg-[#121212] shadow-md border border-[rgba(255,255,255,0.1)] rounded-md relative backdrop-blur-sm text-gray-200"
            >
              <div className="grid gap-1">
                {title && <div className="text-xs font-medium text-blue-300">{title}</div>}
                {description && (
                  <div className="text-xs text-gray-300">{description}</div>
                )}
              </div>
              {action}
              <button 
                onClick={() => dismiss(id)} 
                className="absolute right-1 top-1 rounded-md p-1 text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </ToastProvider>
  )
}
