"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useNavigation } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Month dropdown + typeable year in the caption (useful for DOB pickers). */
  monthYearPicker?: boolean
  fromYear?: number
  toYear?: number
}

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function MonthYearCaption({
  displayMonth,
  fromYear,
  toYear,
}: {
  displayMonth: Date
  fromYear: number
  toYear: number
}) {
  const { goToMonth } = useNavigation()
  const month = displayMonth.getMonth()
  const year = displayMonth.getFullYear()
  const [yearInput, setYearInput] = React.useState(String(year))

  React.useEffect(() => {
    setYearInput(String(year))
  }, [year])

  const applyYear = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4)
    setYearInput(digits)
    if (digits.length !== 4) return
    const nextYear = Number(digits)
    if (Number.isNaN(nextYear)) return
    const clamped = Math.min(toYear, Math.max(fromYear, nextYear))
    goToMonth(new Date(clamped, month, 1))
    if (clamped !== nextYear) setYearInput(String(clamped))
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <select
        aria-label="Month"
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        value={month}
        onChange={(e) => goToMonth(new Date(year, Number(e.target.value), 1))}
      >
        {MONTH_OPTIONS.map((label, index) => (
          <option key={label} value={index}>
            {label}
          </option>
        ))}
      </select>
      <input
        aria-label="Year"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-center text-sm tabular-nums"
        value={yearInput}
        onChange={(e) => applyYear(e.target.value)}
        onBlur={() => {
          if (yearInput.length < 4) setYearInput(String(year))
        }}
      />
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  monthYearPicker = false,
  fromYear,
  toYear,
  components,
  ...props
}: CalendarProps) {
  const resolvedFromYear = fromYear ?? 1920
  const resolvedToYear = toYear ?? new Date().getFullYear() + 10

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      fromYear={monthYearPicker ? resolvedFromYear : fromYear}
      toYear={monthYearPicker ? resolvedToYear : toYear}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: monthYearPicker
          ? "flex items-center justify-center"
          : "text-sm font-medium",
        nav: monthYearPicker
          ? "hidden"
          : "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
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
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...iconProps }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...iconProps} />
        ),
        IconRight: ({ className, ...iconProps }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...iconProps} />
        ),
        ...(monthYearPicker
          ? {
              CaptionLabel: ({ displayMonth }: { displayMonth: Date }) => (
                <MonthYearCaption
                  displayMonth={displayMonth}
                  fromYear={resolvedFromYear}
                  toYear={resolvedToYear}
                />
              ),
            }
          : {}),
        ...components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
