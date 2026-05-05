import { useState, useEffect, forwardRef, KeyboardEvent, FocusEvent } from 'react';
import { Input } from '@/components/ui/input';
import { formatThousands, parseThousands } from '@/lib/formatAmount';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  min?: number;
  max?: number;
  showCurrency?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  id?: string;
  name?: string;
  required?: boolean;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(({
  value,
  onChange,
  placeholder = '0',
  className = '',
  disabled = false,
  autoFocus = false,
  min = 0,
  max = 999_999_999,
  showCurrency = true,
  onKeyDown,
  onBlur,
  id,
  name,
  required,
}, ref) => {
  const [display, setDisplay] = useState<string>(() =>
    value !== '' && value !== 0 && value != null ? formatThousands(value) : ''
  );

  useEffect(() => {
    const formatted =
      value !== '' && value !== 0 && value != null ? formatThousands(value) : '';
    if (formatted !== display) {
      setDisplay(formatted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setDisplay('');
      onChange(0);
      return;
    }
    const num = parseThousands(raw);
    const clamped = Math.min(max, Math.max(min, num));
    setDisplay(formatThousands(clamped));
    onChange(clamped);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9\u202F\u00A0\s]*"
        value={display}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        id={id}
        name={name}
        required={required}
        className={cn(showCurrency && 'pr-10')}
      />
      {showCurrency && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          F
        </span>
      )}
    </div>
  );
});

MoneyInput.displayName = 'MoneyInput';

export default MoneyInput;
