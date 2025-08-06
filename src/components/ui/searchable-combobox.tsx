"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface SearchableComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  onSearchChange: (search: string) => void
  searchValue: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  loading?: boolean
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  onSearchChange,
  searchValue,
  placeholder = "Seleccionar opción...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  disabled = false,
  className,
  loading = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  // Debug: Log de opciones recibidas
  React.useEffect(() => {
    console.log('🔍 SearchableCombobox - Opciones recibidas:', options.length, options);
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
            <PopoverContent className="w-full p-0">
        <div className="p-2">
          <Input 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : options.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="space-y-1">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onClick={(e) => {
                      console.log('🖱️ Seleccionando guardia:', option.label, 'disabled:', option.disabled);
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      value === option.value && "bg-accent text-accent-foreground",
                      option.description?.includes('Asignado a') && "bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-500"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className={cn(
                        option.description?.includes('Asignado a') && "font-medium text-orange-700 dark:text-orange-300"
                      )}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span className={cn(
                          "text-xs",
                          option.description.includes('Asignado a') 
                            ? "text-orange-600 dark:text-orange-400 font-medium" 
                            : option.description.includes('Ya tiene turno asignado')
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-muted-foreground"
                        )}>
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 