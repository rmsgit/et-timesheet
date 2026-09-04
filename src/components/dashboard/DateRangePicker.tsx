"use client"

import * as React from "react"
import { format, isSameDay } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  dateRange?: DateRange;
  onDateChange: (dateRange?: DateRange) => void;
  disabled?: boolean;
}

export function DateRangePicker({
  className,
  dateRange,
  onDateChange,
  disabled
}: DateRangePickerProps) {
  const isMobile = useIsMobile()

  return (
    <div className={cn("grid w-full max-w-full gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
              !dateRange?.from && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {dateRange?.from ? (
                dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                "Pick a date range"
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateChange}
            numberOfMonths={isMobile ? 1 : 2}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
