import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Gratuit",
    price: "0",
    desc: "Pour découvrir Mon Jeton.",
    features: [
      "1 portefeuille",
      "50 transactions / mois",
      "Catégorisation auto",
      "Rapports basiques",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "2 000",
    desc: "Pour les utilisateurs réguliers.",
    features: [
      "5 portefeuilles",
      "Transactions illimitées",
      "IA Scan factures (50/mois)",
      "Rapports avancés",
      "Export PDF",
    ],
    highlighted: false,
  },
  {
    name: "Ultra Pro",
    price: "5 000",
    desc: "L'expérience complète.",
    features: [
      "Portefeuilles illimités",
      "Transactions illimitées",
      "IA Scan illimité",
      "Mode entreprise",
      "Chat intégré",
      "Conversion devises",
      "Support prioritaire",
    ],
    highlighted: true,
  },
];

const Pricing = () => (
  <section id="pricing" className="py-24 px-5">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-4">Tarifs simples et transparents</h2>
        <p className="text-[#79847E]">Choisis le plan qui te convient.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-2xl p-6 border ${
              plan.highlighted
                ? "bg-[rgba(141,214,33,0.05)] border-[#8DD621]/40 shadow-[0_0_30px_rgba(141,214,33,0.25)]"
                : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]"
            }`}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8DD621] text-[#151C18] font-bold hover:bg-[#8DD621]">
                Recommandé
              </Badge>
            )}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#D5D7D6]">{plan.name}</h3>
              <p className="text-sm text-[#79847E] mb-4">{plan.desc}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#D5D7D6]">{plan.price}</span>
                <span className="text-sm text-[#79847E]">FCFA / mois</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#D5D7D6]">
                  <Check className="w-4 h-4 text-[#8DD621] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="https://play.google.com/store/apps/details?id=monjeton" target="_blank" rel="noopener noreferrer">
              <Button
                className={`w-full ${
                  plan.highlighted
                    ? "bg-[#8DD621] text-[#151C18] font-bold hover:bg-[#8DD621]/90"
                    : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#D5D7D6] hover:bg-[rgba(255,255,255,0.08)]"
                }`}
              >
                Commencer
              </Button>
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Pricing;
