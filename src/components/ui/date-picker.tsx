"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  value?: string | Date
  onDateChange?: (date: Date | undefined) => void
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  value,
  onDateChange,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled = false
}: DatePickerProps) {
  const selectedDate: Date | undefined = React.useMemo(() => {
    if (date instanceof Date) return date;
    if (value instanceof Date) return value;
    if (typeof value === 'string' && value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  }, [date, value]);

  const handleSelect = (d?: Date) => {
    onDateChange?.(d);
    if (onChange) {
      const str = d ? format(d, 'yyyy-MM-dd') : '';
      onChange(str);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !selectedDate && "text-muted-foreground",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP", { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border shadow-lg bg-popover text-popover-foreground" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          locale={es}
          showOutsideDays={true}
           className="rounded-md border bg-background text-foreground"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center px-8",
            caption_label: "text-sm font-medium text-foreground",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-8 w-8 bg-background text-foreground border border-input hover:bg-accent hover:text-accent-foreground p-0 opacity-100 hover:opacity-100 rounded-md flex items-center justify-center",
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            ),
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-blue-100 text-blue-900 hover:bg-blue-200 focus:bg-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800 dark:focus:bg-blue-800 font-semibold",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle:
              "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// Exportar también como DatePickerComponent para compatibilidad
export const DatePickerComponent = DatePicker 