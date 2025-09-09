"use client";

import * as React from "react";
import { Search } from "lucide-react";

interface UltraSimpleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const UltraSimpleInput: React.FC<UltraSimpleInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-8 h-8 text-xs border-0 focus-visible:ring-0 bg-transparent placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 focus:border-0"
      />
    </div>
  );
};

export { UltraSimpleInput };