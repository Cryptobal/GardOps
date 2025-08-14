"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
}

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
}

type RadioGroupContextValue = {
  value?: string
  onValueChange?: (value: string) => void
} | null

const RadioGroupContext = React.createContext<RadioGroupContextValue>(null)

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, checked, onChange, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext)
    const isControlled = ctx !== null
    const isChecked = isControlled ? ctx?.value === value : checked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        ctx?.onValueChange?.(value)
      }
      onChange?.(e)
    }

    return (
      <input
        ref={ref}
        type="radio"
        value={value}
        checked={!!isChecked}
        onChange={handleChange}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
