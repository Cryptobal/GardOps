"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleStatusProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ToggleStatus: React.FC<ToggleStatusProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-16 h-8 text-xs',
    md: 'w-20 h-10 text-sm',
    lg: 'w-24 h-12 text-base'
  };

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
        sizeClasses[size],
        checked
          ? 'bg-green-500 focus:ring-green-500'
          : 'bg-gray-400 focus:ring-gray-400',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:shadow-md',
        className
      )}
    >
      {/* Slider */}
      <div
        className={cn(
          'absolute left-1 top-1 bg-white rounded-full transition-all duration-300 ease-in-out shadow-sm',
          size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10',
          checked
            ? size === 'sm' ? 'translate-x-8' : size === 'md' ? 'translate-x-10' : 'translate-x-12'
            : 'translate-x-0'
        )}
      />
      
      {/* Text Labels */}
      <div className="flex justify-between items-center w-full px-2">
        <span
          className={cn(
            'font-medium transition-colors duration-300',
            checked ? 'text-white' : 'text-gray-700'
          )}
        >
          {checked ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </button>
  );
}; 