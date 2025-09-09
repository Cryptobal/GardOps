'use client'

import React, { useState } from 'react'
import { Input } from './input'
import { Button } from './button'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function PasswordInput({ label, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={props.id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? 'text' : 'password'}
          className={`pr-10 ${className || ''}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <span className="text-lg">🙈</span>
          ) : (
            <span className="text-lg">👁️</span>
          )}
        </Button>
      </div>
    </div>
  )
}
