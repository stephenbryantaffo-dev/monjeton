import { motion } from "framer-motion";
import { ScanLine, Receipt, ArrowRight, ArrowLeftRight } from "lucide-react";

const AIScan = () => (
  <section id="ai-scan" className="py-24 px-5">
    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      {/* Left — explanation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8DD621]/10 text-[#8DD621] text-xs font-semibold mb-6">
          <ScanLine className="w-3.5 h-3.5" />
          Alimenté par l'IA
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-6">
          Scanne. Détecte. Enregistre.
        </h2>
        <div className="space-y-5">
          {[
            { icon: Receipt, text: "Scanne une facture de supermarché ou un reçu papier." },
            { icon: ScanLine, text: "Scanne une capture d'écran Mobile Money (Orange, MTN, Wave…)." },
            { icon: ArrowRight, text: "L'IA extrait le marchand, le montant, la devise et la date." },
            { icon: ArrowLeftRight, text: "Conversion automatique en FCFA si la facture est en devise étrangère." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-[#8DD621]" />
              </div>
              <p className="text-[#D5D7D6] text-sm leading-relaxed pt-1.5">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right — mockup */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative"
      >
        <div className="rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-6 space-y-4">
          <div className="text-xs text-[#79847E] mb-2">Résultat du scan IA</div>
          <div className="space-y-3">
            {[
              { label: "Marchand", value: "Carrefour Abidjan" },
              { label: "Date", value: "12 mars 2026" },
              { label: "Montant original", value: "2 500 USD" },
              { label: "Taux de change", value: "1 USD = 615 FCFA" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-xs text-[#79847E]">{row.label}</span>
                <span className="text-sm text-[#D5D7D6] font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#8DD621]/10 border border-[#8DD621]/20 p-4 text-center">
            <div className="text-xs text-[#79847E] mb-1">Montant converti</div>
            <div className="text-2xl font-bold text-[#8DD621]">1 537 500 FCFA</div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default AIScan;
