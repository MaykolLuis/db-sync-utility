import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  variant?: "default" | "red" | "blue" | "gray";
  className?: string;
  action?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  variant = "default",
  className,
  action,
}: SectionHeaderProps) {
  const variantStyles = {
    default: "bg-gradient-to-r from-[#e11d48] to-[#be123c] text-white",
    red: "bg-gradient-to-r from-[#e11d48] to-[#be123c] text-white",
    blue: "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white",
    gray: "bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white",
  };

  return (
    <div className={cn(
      "p-4 rounded-t-lg",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-semibold m-0">{title}</h3>
          {description && (
            <p className="text-xs opacity-90 mt-0.5">{description}</p>
          )}
        </div>
        {action && (
          <div className="ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
