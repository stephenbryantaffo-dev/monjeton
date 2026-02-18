import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "0",
    desc: "Pour découvrir Mon Jeton.",
    features: ["1 portefeuille", "50 transactions / mois", "Catégorisation auto", "Rapports basiques"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "2 000",
    desc: "Pour les utilisateurs réguliers.",
    features: ["5 portefeuilles", "Transactions illimitées", "IA Scan factures (50/mois)", "Rapports avancés", "Export PDF"],
    highlighted: false,
  },
  {
    name: "Ultra Pro",
    price: "5 000",
    desc: "L'expérience complète.",
    features: ["Portefeuilles illimités", "Transactions illimitées", "IA Scan illimité", "Mode entreprise", "Chat intégré", "Conversion devises", "Support prioritaire"],
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
        <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-4">Tarifs simples et transparents</h2>
        <p className="text-[rgba(234,251,234,0.72)]">Choisissez le plan qui vous convient.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className={`relative rounded-2xl p-6 border backdrop-blur-[22px] transition-all ${
              plan.highlighted
                ? "bg-[rgba(124,255,58,0.06)] border-[rgba(124,255,58,0.4)] shadow-[0_0_35px_rgba(124,255,58,0.2)]"
                : "bg-[rgba(124,255,58,0.03)] border-[rgba(124,255,58,0.18)]"
            }`}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A] shadow-[0_0_20px_rgba(124,255,58,0.4)]">
                Recommandé
              </Badge>
            )}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#EAFBEA]">{plan.name}</h3>
              <p className="text-sm text-[rgba(234,251,234,0.72)] mb-4">{plan.desc}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#EAFBEA]">{plan.price}</span>
                <span className="text-sm text-[rgba(234,251,234,0.72)]">FCFA / mois</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#EAFBEA]">
                  <Check className="w-4 h-4 text-[#7CFF3A] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/signup">
              <Button
                className={`w-full ${
                  plan.highlighted
                    ? "bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A]/90 shadow-[0_0_20px_rgba(124,255,58,0.3)]"
                    : "bg-[rgba(124,255,58,0.06)] border border-[rgba(124,255,58,0.18)] text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.12)]"
                }`}
              >
                Créer un compte
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Pricing;
