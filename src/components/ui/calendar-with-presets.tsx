import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface Preset {
  label: string;
  range: DateRange;
}

function getPresets(): Preset[] {
  const today = new Date();
  return [
    { label: "Aujourd'hui", range: { from: today, to: today } },
    { label: "Hier", range: { from: subDays(today, 1), to: subDays(today, 1) } },
    { label: "7 derniers jours", range: { from: subDays(today, 6), to: today } },
    { label: "14 derniers jours", range: { from: subDays(today, 13), to: today } },
    { label: "30 derniers jours", range: { from: subDays(today, 29), to: today } },
    {
      label: "Ce mois",
      range: { from: startOfMonth(today), to: today },
    },
    {
      label: "Mois dernier",
      range: {
        from: startOfMonth(subDays(startOfMonth(today), 1)),
        to: endOfMonth(subDays(startOfMonth(today), 1)),
      },
    },
  ];
}

interface CalendarWithPresetsProps {
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
  onPresetSelect?: (range: DateRange) => void;
}

function CalendarWithPresets({
  selected,
  onSelect,
  onPresetSelect,
}: CalendarWithPresetsProps) {
  const isMobile = useIsMobile();
  const presets = React.useMemo(() => getPresets(), []);
  const [month, setMonth] = React.useState(selected?.to || new Date());

  return (
    <div className={cn("flex max-w-[calc(100vw-2rem)]", isMobile ? "flex-col" : "flex-row")}>
      {/* Presets sidebar */}
      <div
        className={cn(
          "flex gap-1 p-2 scrollbar-none",
          isMobile
            ? "flex-row overflow-x-auto border-b border-border -mx-0"
            : "flex-col overflow-y-auto border-r border-border min-w-[140px] max-h-[300px]"
        )}
        style={isMobile ? { scrollbarWidth: "none" } : undefined}
      >
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              onSelect?.(preset.range);
              setMonth(preset.range.to || new Date());
              onPresetSelect?.(preset.range);
            }}
            className={cn(
              "text-xs font-medium px-3 py-2 rounded-lg transition-all whitespace-nowrap text-left",
              "hover:bg-primary/10 hover:text-primary",
              selected?.from?.toDateString() === preset.range.from?.toDateString() &&
                selected?.to?.toDateString() === preset.range.to?.toDateString()
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <DayPicker
        mode="range"
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={1}
        showOutsideDays
        className={cn("p-3 pointer-events-auto w-full")}
        classNames={{
          months: "flex flex-col space-y-4",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: cn(
            "h-9 w-9 text-center text-sm p-0 relative",
            "[&:has([aria-selected].day-range-end)]:rounded-r-md",
            "[&:has([aria-selected].day-outside)]:bg-primary/20",
            "[&:has([aria-selected])]:bg-primary/20",
            "first:[&:has([aria-selected])]:rounded-l-md",
            "last:[&:has([aria-selected])]:rounded-r-md",
            "focus-within:relative focus-within:z-20"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today:
            "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-primary/20 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-primary/20 aria-selected:text-foreground",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
      />
    </div>
  );
}

CalendarWithPresets.displayName = "CalendarWithPresets";

export { CalendarWithPresets };
