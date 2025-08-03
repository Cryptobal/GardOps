"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SimpleSearchInput = React.forwardRef<HTMLInputElement, SimpleSearchInputProps>(
  ({ value, onChange, placeholder, className, disabled, autoFocus, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Manejar cambio de valor de forma simple
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    // Auto focus si se solicita
    React.useEffect(() => {
      if (autoFocus && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }, [autoFocus]);

    return (
      <div className={cn("relative", className)}>
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-8 h-8 text-xs border-0 focus-visible:ring-0 bg-transparent",
            "placeholder:text-gray-400 text-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-0 focus:border-0"
          )}
          {...props}
        />
      </div>
    );
  }
);

SimpleSearchInput.displayName = "SimpleSearchInput";

export { SimpleSearchInput }; 