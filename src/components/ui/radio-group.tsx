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

// Función recursiva para encontrar todos los RadioGroupItem
const findRadioGroupItems = (children: React.ReactNode): React.ReactElement[] => {
  const items: React.ReactElement[] = [];
  
  const traverse = (node: React.ReactNode) => {
    if (!React.isValidElement(node)) return;
    
    if (node.type === RadioGroupItem) {
      items.push(node);
    } else if (node.props && node.props.children) {
      React.Children.forEach(node.props.children, traverse);
    }
  };
  
  React.Children.forEach(children, traverse);
  return items;
};

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    const radioItems = React.useMemo(() => findRadioGroupItems(children), [children]);
    
    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Si es un div u otro contenedor, clonarlo con sus hijos procesados
            if (child.type !== RadioGroupItem) {
              return React.cloneElement(child, {
                children: React.Children.map(child.props.children, (grandChild) => {
                  if (React.isValidElement(grandChild) && grandChild.type === RadioGroupItem) {
                    return React.cloneElement(grandChild, {
                      checked: grandChild.props.value === value,
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          onValueChange?.(grandChild.props.value);
                        }
                      },
                    } as any);
                  }
                  return grandChild;
                })
              });
            }
            // Si es un RadioGroupItem directo, procesarlo normalmente
            return React.cloneElement(child, {
              checked: child.props.value === value,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  onValueChange?.(child.props.value);
                }
              },
            } as any);
          }
          return child;
        })}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, checked, onChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
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
