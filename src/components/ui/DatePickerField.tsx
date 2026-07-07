import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  value?: string | null; // "YYYY-MM-DD" ou ""
  onChange: (value: string) => void; // renvoie "YYYY-MM-DD" ou ""
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string; // "YYYY-MM-DD"
  max?: string;
  clearable?: boolean;
}

const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromISO = (s?: string | null): Date | undefined => {
  if (!s) return undefined;
  // Parse as local date to avoid timezone shifts
  const parts = s.split("T")[0].split("-");
  if (parts.length !== 3) {
    const p = parseISO(s);
    return isValid(p) ? p : undefined;
  }
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return isValid(d) ? d : undefined;
};

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  placeholder = "Choisir une date",
  className,
  disabled,
  min,
  max,
  clearable = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const selected = fromISO(value || undefined);
  const minDate = fromISO(min);
  const maxDate = fromISO(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-left transition-colors hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">
            {selected ? format(selected, "d MMMM yyyy", { locale: fr }) : placeholder}
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toISO(d));
              setOpen(false);
            }
          }}
          locale={fr}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePickerField;
