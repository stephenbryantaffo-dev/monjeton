"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { useState } from "react";
import { openJekoPro, openJekoMax } from "@/lib/jeko";
import { useLandingT } from "@/hooks/useLandingT";
import type { LandingStrings } from "@/lib/landingI18n";

type PlanAction = { kind: "link"; to: string } | { kind: "jeko"; plan: "pro" | "max" };

const buildPlans = (lt: LandingStrings): Array<{
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  buttonText: string;
  popular: boolean;
  includes: readonly string[];
  action: PlanAction;
}> => [
  {
    name: lt.plan_free_name,
    description: lt.plan_free_desc,
    price: 0,
    yearlyPrice: 0,
    buttonText: lt.plan_free_cta,
    popular: false,
    includes: lt.plan_free_features,
    action: { kind: "link", to: "/signup" },
  },
  {
    name: lt.plan_pro_name,
    description: lt.plan_pro_desc,
    price: 2000,
    yearlyPrice: 19900,
    buttonText: lt.plan_pro_cta,
    popular: true,
    includes: lt.plan_pro_features,
    action: { kind: "jeko", plan: "pro" },
  },
  {
    name: lt.plan_max_name,
    description: lt.plan_max_desc,
    price: 5000,
    yearlyPrice: 49900,
    buttonText: lt.plan_max_cta,
    popular: false,
    includes: lt.plan_max_features,
    action: { kind: "jeko", plan: "max" },
  },
];

const PricingSwitch = ({
  onSwitch,
  labels,
}: {
  onSwitch: (value: string) => void;
  labels: { monthly: string; yearly: string };
}) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center mb-12">
      <div className="relative flex items-center gap-1 p-1 rounded-full bg-[rgba(124,255,58,0.06)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[18px]">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 h-10 rounded-full px-6 py-2 font-medium text-sm transition-colors",
            selected === "0" ? "text-[#05070A]" : "text-[rgba(234,251,234,0.72)]"
          )}
        >
          {selected === "0" && (
            <motion.div
              layoutId="pricing-pill"
              className="absolute inset-0 rounded-full bg-[#7CFF3A] shadow-[0_0_20px_rgba(124,255,58,0.4)]"
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{labels.monthly}</span>
        </button>
        <button
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 h-10 rounded-full px-6 py-2 font-medium text-sm transition-colors",
            selected === "1" ? "text-[#05070A]" : "text-[rgba(234,251,234,0.72)]"
          )}
        >
          {selected === "1" && (
            <motion.div
              layoutId="pricing-pill"
              className="absolute inset-0 rounded-full bg-[#7CFF3A] shadow-[0_0_20px_rgba(124,255,58,0.4)]"
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{labels.yearly}</span>
        </button>
      </div>
    </div>
  );
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { lt } = useLandingT();
  const plans = buildPlans(lt);

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  return (
    <section id="pricing" className="py-24 px-5 relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,rgba(124,255,58,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#EAFBEA] mb-4">
            {lt.pricing_title}
          </h2>
          <p className="text-[rgba(234,251,234,0.72)] max-w-lg mx-auto">
            {lt.pricing_subtitle}
          </p>
        </motion.div>

        <PricingSwitch
          onSwitch={togglePricingPeriod}
          labels={{ monthly: lt.pricing_monthly, yearly: lt.pricing_yearly }}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={cn(
                "relative rounded-2xl p-6 border backdrop-blur-[22px] transition-all",
                plan.popular
                  ? "bg-[rgba(124,255,58,0.08)] border-[rgba(124,255,58,0.45)] shadow-[0_0_40px_rgba(124,255,58,0.15)]"
                  : "bg-[rgba(124,255,58,0.03)] border-[rgba(124,255,58,0.18)]"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A] shadow-[0_0_20px_rgba(124,255,58,0.5)]">
                  {lt.pricing_recommended}
                </Badge>
              )}

              {/* Popular card sparkle border */}
              {plan.popular && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,255,58,0.08)_0%,transparent_50%)]" />
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#EAFBEA] mb-1">{plan.name}</h3>
                <p className="text-sm text-[rgba(234,251,234,0.55)] mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <NumberFlow
                    value={isYearly ? plan.yearlyPrice : plan.price}
                    format={{ style: "decimal", useGrouping: true }}
                    className="text-4xl font-black text-[#EAFBEA]"
                    transformTiming={{ duration: 400, easing: "ease-out" }}
                  />
                  <span className="text-sm text-[rgba(234,251,234,0.55)] ml-1">
                    FCFA /{isYearly ? "an" : "mois"}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.includes.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#EAFBEA]">
                    <Check className="w-4 h-4 text-[#7CFF3A] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.action.kind === "link" ? (
                <Button
                  asChild
                  className={cn(
                    "w-full font-semibold transition-all",
                    plan.popular
                      ? "bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A]/90 shadow-[0_0_20px_rgba(124,255,58,0.3)] hover:shadow-[0_0_30px_rgba(124,255,58,0.5)]"
                      : "bg-[rgba(124,255,58,0.08)] border border-[rgba(124,255,58,0.18)] text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.15)]"
                  )}
                >
                  <Link to={plan.action.to}>{plan.buttonText}</Link>
                </Button>
              ) : (
                <Button
                  onClick={() => (plan.action.kind === "jeko" && plan.action.plan === "pro" ? openJekoPro() : openJekoMax())}
                  className={cn(
                    "w-full font-semibold transition-all",
                    plan.popular
                      ? "bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A]/90 shadow-[0_0_20px_rgba(124,255,58,0.3)] hover:shadow-[0_0_30px_rgba(124,255,58,0.5)]"
                      : "bg-[rgba(124,255,58,0.08)] border border-[rgba(124,255,58,0.18)] text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.15)]"
                  )}
                >
                  {plan.buttonText}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
