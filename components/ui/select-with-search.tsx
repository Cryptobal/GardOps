"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectWithSearchProps {
  options: SelectOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function SelectWithSearch({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados.",
  disabled = false,
  className,
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedOption = options.find(option => option.value === value)

  // Función de filtrado inteligente
  const filterOptions = React.useMemo(() => {
    if (!searchValue) return options

    const searchTerm = searchValue.toLowerCase().trim()
    
    // Separar opciones en diferentes categorías de coincidencia
    const exactMatches: SelectOption[] = []
    const startsWithMatches: SelectOption[] = []
    const containsMatches: SelectOption[] = []
    
    options.forEach(option => {
      const label = option.label.toLowerCase()
      
      // Extraer nombre y RUT del label (formato: "Nombre Apellido - RUT")
      const parts = label.split(' - ')
      const nombre = parts[0] || ''
      const rut = parts[1] || ''
      
      // Separar palabras del nombre para buscar por palabra completa
      const palabrasNombre = nombre.split(' ').filter(p => p.length > 0)
      
      // 1. Coincidencia exacta (nombre completo o RUT completo)
      if (nombre === searchTerm || rut === searchTerm) {
        exactMatches.push(option)
      }
      // 2. Comienza con el término buscado
      else if (
        nombre.startsWith(searchTerm) || 
        rut.startsWith(searchTerm) ||
        palabrasNombre.some(palabra => palabra.startsWith(searchTerm))
      ) {
        startsWithMatches.push(option)
      }
      // 3. Contiene el término buscado
      else if (label.includes(searchTerm)) {
        containsMatches.push(option)
      }
    })
    
    // Retornar en orden de prioridad: exactas, comienzan con, contienen
    return [...exactMatches, ...startsWithMatches, ...containsMatches]
  }, [options, searchValue])

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
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filterOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setSearchValue("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 