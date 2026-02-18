import { motion } from "framer-motion";
import { ScanLine, Upload, ArrowRight, FileText, ArrowLeftRight } from "lucide-react";

const steps = [
  { icon: Upload, label: "Upload facture", detail: "Importez votre reçu ou capture Mobile Money" },
  { icon: FileText, label: "Extraction IA", detail: "Montant : 2 500 USD • Marchand : Carrefour" },
  { icon: ArrowLeftRight, label: "Conversion FCFA", detail: "2 500 USD → 1 537 500 FCFA (taux du jour)" },
  { icon: ScanLine, label: "Catégorisation", detail: "Catégorie : Alimentation • Date : 12 mars 2026" },
];

const AIScan = () => (
  <section id="ai-scan" className="py-24 px-5">
    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(124,255,58,0.1)] text-[#7CFF3A] text-xs font-semibold mb-6 border border-[rgba(124,255,58,0.18)]">
          <ScanLine className="w-3.5 h-3.5" />
          Alimenté par l'IA
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-6">
          Scan AI : importez vos factures en 1 clic
        </h2>
        <p className="text-[rgba(234,251,234,0.72)] mb-8 leading-relaxed">
          Mon Jeton détecte automatiquement le montant, la devise (USD, EUR, XOF, etc.), puis convertit en FCFA.
        </p>
        <div className="space-y-5">
          {[
            "Scanne une facture de supermarché ou un reçu papier.",
            "Scanne une capture d'écran Mobile Money (Orange, MTN, Wave…).",
            "L'IA extrait le marchand, le montant, la devise et la date.",
            "Conversion automatique en FCFA si la facture est en devise étrangère.",
          ].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3"
            >
              <ArrowRight className="w-4 h-4 text-[#7CFF3A] mt-1 shrink-0" />
              <p className="text-sm text-[rgba(234,251,234,0.72)] leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mockup UI */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="rounded-2xl bg-[rgba(124,255,58,0.03)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[22px] p-6 space-y-4">
          <div className="text-xs text-[rgba(234,251,234,0.72)] mb-3 font-semibold">Pipeline Scan AI</div>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.12 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-[rgba(124,255,58,0.04)] border border-[rgba(124,255,58,0.1)]"
            >
              <div className="w-9 h-9 rounded-lg bg-[rgba(124,255,58,0.12)] flex items-center justify-center shrink-0">
                <step.icon className="w-4 h-4 text-[#7CFF3A]" />
              </div>
              <div>
                <div className="text-sm text-[#EAFBEA] font-medium">{step.label}</div>
                <div className="text-xs text-[rgba(234,251,234,0.55)]">{step.detail}</div>
              </div>
            </motion.div>
          ))}
          <div className="mt-4 rounded-xl bg-[rgba(124,255,58,0.08)] border border-[rgba(124,255,58,0.25)] p-4 text-center">
            <div className="text-xs text-[rgba(234,251,234,0.72)] mb-1">Montant converti</div>
            <div className="text-2xl font-bold text-[#7CFF3A]">1 537 500 FCFA</div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default AIScan;
