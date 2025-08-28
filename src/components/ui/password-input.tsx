'use client';

import React, { useState } from 'react'
import { Input } from './input'
import { Button } from './button'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  className?: string
  autoComplete?: string
  minLength?: number
  label?: string
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  className = "",
  autoComplete = "current-password",
  minLength,
  label
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full pr-12 ${className}`}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        >
          {showPassword ? "🙈" : "👁️"}
        </Button>
      </div>
    </div>
  )
}
