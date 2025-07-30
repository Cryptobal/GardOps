"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  showClearButton?: boolean;
  required?: boolean;
}

export function DatePickerComponent({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  minDate,
  maxDate,
  disabled = false,
  className = "",
  showClearButton = false,
  required = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedDate = value ? new Date(value) : null;
  
  const handleDateChange = (date: Date | null) => {
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      onChange(formattedDate);
    } else {
      onChange("");
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          onCalendarOpen={() => setIsOpen(true)}
          onCalendarClose={() => setIsOpen(false)}
          open={isOpen}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          placeholderText={placeholder}
          dateFormat="dd/MM/yyyy"
          showPopperArrow={false}
          popperPlacement="bottom-start"
          customInput={
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 text-left",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-between",
                !value && "text-slate-400"
              )}
              disabled={disabled}
            >
              <span className={cn(!value && "text-slate-400")}>
                {value ? formatDisplayDate(value) : placeholder}
              </span>
              <Calendar className="h-4 w-4 text-slate-400" />
            </button>
          }
          calendarClassName="!bg-slate-800 !border-slate-600 !text-slate-200"
          dayClassName={(date) => {
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            
            if (isSelected) return "!bg-blue-600 !text-white";
            if (isToday) return "!bg-slate-600 !text-white";
            return "!text-slate-200 hover:!bg-slate-700";
          }}
          monthClassName={() => "!text-slate-200"}
          yearClassName={() => "!text-slate-200"}
        />
        
        {showClearButton && value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-700"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {required && !value && (
        <p className="text-sm text-red-400 mt-1">Este campo es requerido</p>
      )}
    </div>
  );
} 