import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── BoxReveal ───────────────────────────────────────────
interface BoxRevealProps {
  children: React.ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export const BoxReveal = ({
  children,
  width = "fit-content",
  boxColor = "hsl(84 81% 44%)",
  duration = 0.5,
  delay = 0,
  className,
}: BoxRevealProps) => (
  <div className={cn("relative overflow-hidden", className)} style={{ width }}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
    <motion.div
      className="absolute inset-0"
      style={{ background: boxColor }}
      initial={{ left: 0 }}
      animate={{ left: "100%" }}
      transition={{ duration: duration * 0.8, delay, ease: "easeIn" }}
    />
  </div>
);

// ─── AnimatedInput ───────────────────────────────────────
interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, label, icon, endIcon, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <motion.div
          className={cn(
            "relative flex items-center rounded-xl border bg-secondary/50 transition-colors",
            focused
              ? "border-primary shadow-[0_0_0_2px_hsl(84_81%_44%/0.15)]"
              : "border-border hover:border-primary/40"
          )}
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.2 }}
        >
          {/* Gradient border overlay on focus */}
          <AnimatePresence>
            {focused && (
              <motion.div
                className="absolute -inset-px rounded-xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(84 81% 44% / 0.3), hsl(270 70% 60% / 0.2), hsl(84 81% 44% / 0.1))",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>

          {icon && (
            <span className="relative z-10 pl-3 text-muted-foreground">{icon}</span>
          )}
          <input
            ref={ref}
            className={cn(
              "relative z-10 flex h-12 w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-2",
              endIcon && "pr-2",
              className
            )}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {endIcon && (
            <span className="relative z-10 pr-3 text-muted-foreground">
              {endIcon}
            </span>
          )}
        </motion.div>
      </div>
    );
  }
);
AnimatedInput.displayName = "AnimatedInput";

// ─── AnimatedForm ────────────────────────────────────────
interface AnimatedFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export const AnimatedForm = ({ children, onSubmit, className }: AnimatedFormProps) => (
  <motion.form
    onSubmit={onSubmit}
    className={cn("space-y-5", className)}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
  >
    {children}
  </motion.form>
);

// ─── Ripple Background ──────────────────────────────────
export const Ripple = ({ className }: { className?: string }) => (
  <div className={cn("absolute inset-0 overflow-hidden", className)}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="absolute left-1/2 top-1/2 animate-ripple rounded-full border border-primary/10"
        style={
          {
            width: `${200 + i * 120}px`,
            height: `${200 + i * 120}px`,
            "--i": i,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

// ─── OrbitingCircles ────────────────────────────────────
interface OrbitingCirclesProps {
  children: React.ReactNode;
  radius: number;
  duration: number;
  delay?: number;
  reverse?: boolean;
  className?: string;
}

export const OrbitingCircles = ({
  children,
  radius,
  duration,
  delay = 0,
  reverse = false,
  className,
}: OrbitingCirclesProps) => (
  <div
    className={cn(
      "absolute left-1/2 top-1/2 -ml-4 -mt-4 animate-orbit",
      reverse && "[animation-direction:reverse]",
      className
    )}
    style={
      {
        "--radius": radius,
        "--duration": duration,
        animationDelay: `${delay}s`,
      } as React.CSSProperties
    }
  >
    {children}
  </div>
);
