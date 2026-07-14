"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import MarkerText from "@/components/landing/MarkerText";
import { openJekoPro, openJekoMax } from "@/lib/jeko";
import { useLandingT } from "@/hooks/useLandingT";

interface Plan {
  id: string;
  name: string;
  price: number;
  yearlyLabel: string;
  features: readonly string[];
  buttonText: string;
  popular: boolean;
  action: () => void;
}

const Pricing = () => {
  const navigate = useNavigate();
  const { lt } = useLandingT();

  const plans: Plan[] = [
    {
      id: "free",
      name: lt.pl_free_name,
      price: 0,
      yearlyLabel: lt.pl_free_yearly,
      features: lt.pl_free_features,
      buttonText: lt.pl_free_button,
      popular: false,
      action: () => navigate("/signup"),
    },
    {
      id: "pro",
      name: lt.pl_pro_name,
      price: 2000,
      yearlyLabel: lt.pl_pro_yearly,
      features: lt.pl_pro_features,
      buttonText: lt.pl_pro_button,
      popular: true,
      action: () => openJekoPro(),
    },
    {
      id: "ultra",
      name: lt.pl_ultra_name,
      price: 5000,
      yearlyLabel: lt.pl_ultra_yearly,
      features: lt.pl_ultra_features,
      buttonText: lt.pl_ultra_button,
      popular: false,
      action: () => openJekoMax(),
    },
  ];

  const formatPrice = (value: number) =>
    value.toLocaleString("fr-FR", { useGrouping: true });

  return (
    <section
      id="pricing"
      className="py-24 px-5 relative overflow-hidden bg-[#14171C]"
    >
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <Badge
            variant="secondary"
            className="mb-5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[rgba(124,255,58,0.10)] text-[#7CFF3A] border border-[rgba(124,255,58,0.18)] hover:bg-[rgba(124,255,58,0.14)]"
          >
            {lt.pricing_landing_badge}
          </Badge>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#EAFBEA] mb-4 uppercase tracking-tight">
            {lt.pricing_landing_title_before}{" "}
            <MarkerText variant="dark">{lt.pricing_landing_title_word}</MarkerText>
          </h2>

          <p className="text-[rgba(234,251,234,0.72)] max-w-lg mx-auto text-base sm:text-lg">
            {lt.pricing_landing_subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={cn(
                "relative flex flex-col rounded-[20px] p-[26px] backdrop-blur-[22px] transition-all",
                plan.popular
                  ? "bg-[rgba(255,255,255,0.02)] border-2 border-[#7CFF3A] shadow-[0_0_50px_rgba(124,255,58,0.16)]"
                  : "bg-[rgba(255,255,255,0.02)] border border-[rgba(124,255,58,0.14)]"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#7CFF3A] text-[#0d1512] text-xs font-bold hover:bg-[#7CFF3A] shadow-[0_0_20px_rgba(124,255,58,0.4)]">
                  {lt.pricing_landing_popular}
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#7CFF3A] mb-3 uppercase tracking-wider">
                  {plan.name}
                </h3>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[#EAFBEA] tracking-tight">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-sm text-[rgba(234,251,234,0.55)] font-medium">
                    {lt.pricing_landing_per_month}
                  </span>
                </div>

                <p className="mt-2 text-sm text-[rgba(234,251,234,0.55)]">
                  {plan.yearlyLabel}
                </p>
              </div>

              <ul className="flex-1 space-y-3.5 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-[#EAFBEA]"
                  >
                    <Check
                      className="w-4 h-4 text-[#7CFF3A] shrink-0 mt-0.5"
                      strokeWidth={2.5}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={plan.action}
                className={cn(
                  "w-full h-12 mt-auto font-semibold rounded-full transition-all",
                  plan.popular
                    ? "bg-[#7CFF3A] text-[#0d1512] font-bold hover:bg-[#8cff55] shadow-[0_0_24px_rgba(124,255,58,0.28)] hover:shadow-[0_0_32px_rgba(124,255,58,0.42)]"
                    : "bg-transparent border border-[rgba(124,255,58,0.35)] text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.10)] hover:border-[rgba(124,255,58,0.55)]"
                )}
              >
                {plan.buttonText}
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center text-sm text-[rgba(234,251,234,0.45)] mt-10"
        >
          {lt.pricing_landing_secure_note}
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
