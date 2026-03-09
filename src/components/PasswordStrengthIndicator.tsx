import { validatePasswordStrength } from "@/lib/security";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

const RULES = [
  { label: "Minimum 8 caractères", test: (p: string) => p.length >= 8 },
  { label: "Une majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Une minuscule", test: (p: string) => /[a-z]/.test(p) },
  { label: "Un chiffre", test: (p: string) => /[0-9]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  if (!password) return null;

  const passed = RULES.filter((r) => r.test(password)).length;
  const percent = (passed / RULES.length) * 100;
  const color =
    percent <= 25 ? "bg-destructive" : percent <= 50 ? "bg-orange-500" : percent <= 75 ? "bg-yellow-500" : "bg-primary";

  return (
    <div className="space-y-2 mt-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all duration-300 rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}>
              {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
