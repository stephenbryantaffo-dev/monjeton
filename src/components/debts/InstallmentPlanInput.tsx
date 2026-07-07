import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Calendar, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoneySmart } from "@/lib/formatMoney";
import { generateInstallments, InstallmentSeed } from "@/lib/debtHistory";
import { DatePickerField } from "@/components/ui/DatePickerField";

interface Props {
  totalAmount: number;
  value: InstallmentSeed[];
  onChange: (rows: InstallmentSeed[]) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

type Mode = "auto" | "manual";

export const InstallmentPlanInput = ({
  totalAmount,
  value,
  onChange,
  enabled,
  onToggle,
}: Props) => {
  const [mode, setMode] = useState<Mode>("auto");
  const [count, setCount] = useState(3);
  const [freq, setFreq] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Auto-régénérer en mode auto
  useEffect(() => {
    if (!enabled || mode !== "auto") return;
    if (totalAmount <= 0 || count <= 0) {
      onChange([]);
      return;
    }
    const generated = generateInstallments({
      total: totalAmount,
      count,
      frequency: freq,
      startDate,
    });
    onChange(generated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode, totalAmount, count, freq, startDate]);

  const sum = useMemo(
    () => value.reduce((s, r) => s + Number(r.expected_amount || 0), 0),
    [value]
  );
  const diff = totalAmount - sum;

  const addManualRow = () => {
    const next = [...value];
    next.push({
      due_date: new Date().toISOString().slice(0, 10),
      expected_amount: 0,
      order_index: next.length,
    });
    onChange(next);
  };

  const updateRow = (idx: number, patch: Partial<InstallmentSeed>) => {
    const next = value.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const removeRow = (idx: number) => {
    const next = value
      .filter((_, i) => i !== idx)
      .map((r, i) => ({ ...r, order_index: i }));
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-primary" />
          <Label className="text-sm font-bold text-foreground">
            Plan de remboursement
          </Label>
          <span className="text-[10px] text-muted-foreground">(optionnel)</span>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {enabled && (
        <>
          <div className="flex gap-1 p-1 glass rounded-lg">
            {(
              [
                { v: "auto" as const, l: "Automatique" },
                { v: "manual" as const, l: "Manuel" },
              ]
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setMode(opt.v)}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  mode === opt.v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {mode === "auto" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nb versements</Label>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                  className="bg-background border-border h-9"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Fréquence</Label>
                <Select value={freq} onValueChange={(v) => setFreq(v as typeof freq)}>
                  <SelectTrigger className="bg-background border-border h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-muted-foreground">
                  Premier versement
                </Label>
                <DatePickerField value={startDate} onChange={(v) => setStartDate(v)} className="bg-background border-border" />
              </div>
            </div>
          )}

          {value.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {value.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-background rounded-lg px-2 py-1.5"
                >
                  <span className="text-[10px] text-muted-foreground w-5">
                    #{i + 1}
                  </span>
                  {mode === "manual" ? (
                    <>
                      <DatePickerField value={row.due_date} onChange={(v) => updateRow(i, { due_date: v })} className="flex-1 bg-secondary border-border" />
                      <MoneyInput
                        value={String(row.expected_amount)}
                        onChange={(n) => updateRow(i, { expected_amount: n || 0 })}
                        showCurrency={false}
                        className="[&>input]:h-8 [&>input]:text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-destructive p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-foreground flex-1">
                        {new Date(row.due_date).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="text-xs font-bold text-primary tabular-nums">
                        {formatMoneySmart(row.expected_amount)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === "manual" && (
            <Button
              type="button"
              variant="glass"
              size="sm"
              className="w-full"
              onClick={addManualRow}
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une échéance
            </Button>
          )}

          <div className="flex justify-between text-[11px] pt-1 border-t border-border">
            <span className="text-muted-foreground">
              Total réparti : {formatMoneySmart(sum)}
            </span>
            <span
              className={
                Math.abs(diff) < 1
                  ? "text-primary font-bold"
                  : "text-destructive font-bold"
              }
            >
              {diff === 0
                ? "✓ Équilibré"
                : diff > 0
                ? `Manque ${formatMoneySmart(diff)}`
                : `Excédent ${formatMoneySmart(-diff)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
