"use client"

import * as React from "react"
import { createPortal } from "react-dom"
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

interface Item {
  id: string
  codigo: string
  nombre: string
  clase?: string
  naturaleza?: string
}

interface ComboboxProps {
  items: Item[]
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  preventSubmitOnEnter?: boolean
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = "Seleccionar ítem...",
  disabled = false,
  searchPlaceholder = "Buscar ítem...",
  emptyMessage = "No se encontraron ítems.",
  preventSubmitOnEnter = true
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [portalRect, setPortalRect] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const selectedItem = items.find(item => item.id === value)

  // Logs temporales para debugging
  React.useEffect(() => {
    console.log('[combobox] onOpenChange', open)
  }, [open])

  React.useEffect(() => {
    console.log('[combobox] total items', items.length)
  }, [items])

  const handleSelect = (item: Item) => {
    console.log('[combobox] select', item)
    onChange(item.id)
    setOpen(false)
  }

  React.useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (!open) return
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [open])

  const updatePortalRect = React.useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPortalRect({
      top: Math.round(r.bottom + window.scrollY),
      left: Math.round(r.left + window.scrollX),
      width: Math.round(r.width),
    })
  }, [])

  React.useEffect(() => {
    if (open) {
      updatePortalRect()
      const onScroll = () => updatePortalRect()
      const onResize = () => updatePortalRect()
      window.addEventListener('scroll', onScroll, true)
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('scroll', onScroll, true)
        window.removeEventListener('resize', onResize)
      }
    }
  }, [open, updatePortalRect])

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        ref={triggerRef}
      >
        {selectedItem ? (
          <div className="flex flex-col items-start">
            <span className="font-medium">{selectedItem.nombre}</span>
            <span className="text-xs text-muted-foreground">
              {selectedItem.codigo} • {selectedItem.clase || 'Sin clase'}
            </span>
          </div>
        ) : (
          placeholder
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && portalRect && createPortal(
        <div
          style={{
            position: 'fixed',
            top: portalRect.top,
            left: portalRect.left,
            width: portalRect.width,
            zIndex: 2000,
            pointerEvents: 'auto',
            opacity: 1,
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
        >
          <div className="rounded-md border border-border bg-popover text-slate-900 dark:text-slate-100 shadow-md overflow-hidden">
            <Command className="text-slate-900 dark:text-slate-100">
              <CommandInput 
                placeholder={searchPlaceholder} 
                className="text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (preventSubmitOnEnter && e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.codigo} ${item.nombre}`}
                      onSelect={() => handleSelect(item)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSelect(item)
                      }}
                      className="cursor-pointer select-none opacity-100 text-slate-900 dark:text-slate-100 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col text-slate-900 dark:text-slate-100">
                        <span className="font-medium">{item.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.codigo} • {item.clase || 'Sin clase'} • {item.naturaleza || 'Sin naturaleza'}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
} 