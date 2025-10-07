"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface SafeSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
}

const SafeSelect = React.forwardRef<HTMLButtonElement, SafeSelectProps>(
  ({ 
    value, 
    onValueChange, 
    disabled, 
    open, 
    onOpenChange, 
    children, 
    placeholder,
    className,
    ...props 
  }, ref) => {
    return (
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      >
        <SelectTrigger ref={ref} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {children}
        </SelectContent>
      </Select>
    );
  }
);

SafeSelect.displayName = "SafeSelect";

export { SafeSelect }; 