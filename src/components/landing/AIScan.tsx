import { motion } from "framer-motion";
import { Camera, Zap, RefreshCw, ShieldCheck, Check, X } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Camera,
    title: "Capturez",
    desc: "Ticket de caisse, reçu papier ou capture d'écran Wave/Orange Money — n'importe quelle image fait l'affaire.",
  },
  {
    num: "02",
    icon: Zap,
    title: "L'IA analyse",
    desc: "Notre moteur OCR lit l'image pixel par pixel. Il identifie le montant exact, le nom du marchand, la date et la devise — même sur une photo floue.",
  },
  {
    num: "03",
    icon: RefreshCw,
    title: "Conversion automatique",
    desc: "Si le montant est en USD, EUR, GHS ou GBP, Mon Jeton le convertit automatiquement en FCFA avec le taux du jour. Zéro calcul manuel.",
  },
  {
    num: "04",
    icon: ShieldCheck,
    title: "Confirmez et archivez",
    desc: "Un tap pour confirmer. La transaction rejoint vos comptes ET le reçu est archivé en sécurité, accessible pour toujours, exportable en PDF.",
  },
];

const capabilities = [
  "Tickets de caisse",
  "Captures Wave / Orange Money",
  "Reçus en devises étrangères",
  "Conversion FCFA automatique",
  "Archive cloud permanente",
  "Export PDF en masse",
];

const mockRows = [
  { label: "Marchand", value: "Supermarché Abi" },
  { label: "Montant", value: "12 500 F CFA" },
  { label: "Devise", value: "XOF (FCFA)" },
  { label: "Catégorie", value: "Alimentation" },
  { label: "Date", value: "Aujourd'hui" },
];

const AIScan = () => (
  <section id="ai-scan" className="py-24 px-5 bg-[#080C10]">
    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
      {/* LEFT — Content */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(126,200,69,0.10)] text-[#7EC845] text-xs font-semibold mb-6 border border-[rgba(126,200,69,0.25)]">
          📸 OCR · IA · Multidevise
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#EAFBEA] mb-6 font-syne leading-tight">
          Une photo suffit.
          <br />
          <span className="text-[#7EC845]">L'IA fait le reste.</span>
        </h2>
        <p className="text-[rgba(234,251,234,0.72)] mb-10 leading-relaxed text-base">
          Vous venez de payer chez un marchand. Vous avez reçu un virement Wave.
          Photographiez — Mon Jeton lit, comprend et enregistre en moins de 5 secondes.
        </p>

        {/* 4 steps with vertical connector */}
        <div className="relative space-y-6">
          <div className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-[rgba(126,200,69,0.4)] via-[rgba(126,200,69,0.2)] to-transparent" />
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative flex gap-4"
            >
              <div className="relative z-10 w-14 h-14 rounded-xl bg-[rgba(126,200,69,0.10)] border border-[rgba(126,200,69,0.30)] flex items-center justify-center shrink-0 backdrop-blur-md">
                <step.icon className="w-5 h-5 text-[#7EC845]" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-mono text-[#7EC845]/60">{step.num}</span>
                  <h3 className="text-[#EAFBEA] font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-[#8892A4] leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Capability badges */}
        <div className="flex flex-wrap gap-2 mt-10">
          {capabilities.map((cap, i) => (
            <motion.span
              key={cap}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(126,200,69,0.10)] border border-[rgba(126,200,69,0.25)] text-[#7EC845] text-xs font-medium"
            >
              <Check className="w-3 h-3" /> {cap}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* RIGHT — Animated mockup */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="lg:sticky lg:top-24"
      >
        <div className="rounded-2xl bg-[rgba(126,200,69,0.03)] border border-[rgba(126,200,69,0.30)] backdrop-blur-[22px] p-6 shadow-[0_0_40px_rgba(126,200,69,0.15)]">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="text-xs text-[#EAFBEA] font-medium flex items-center gap-2">
              📸 Scan en cours...
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-[rgba(126,200,69,0.10)] overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                whileInView={{ width: "85%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                className="h-full bg-[#7EC845]"
              />
            </div>
          </div>

          <div className="h-px bg-[rgba(126,200,69,0.20)] mb-4" />

          {/* Extracted rows */}
          <div className="space-y-3">
            {mockRows.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.18 }}
                className="flex items-center justify-between py-2"
              >
                <span className="text-xs text-[#8892A4] uppercase tracking-wider">{row.label}</span>
                <span className="text-sm text-[#EAFBEA] font-semibold">{row.value}</span>
              </motion.div>
            ))}
          </div>

          <div className="h-px bg-[rgba(126,200,69,0.20)] my-4" />

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.5 }}
            className="grid grid-cols-2 gap-3"
          >
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#7EC845] text-[#05070A] text-sm font-semibold hover:brightness-110 transition">
              <Check className="w-4 h-4" /> Confirmer
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[rgba(234,251,234,0.05)] border border-[rgba(234,251,234,0.15)] text-[#EAFBEA] text-sm font-semibold hover:bg-[rgba(234,251,234,0.08)] transition">
              <X className="w-4 h-4" /> Rejeter
            </button>
          </motion.div>
        </div>

        {/* Subtle helper text */}
        <p className="text-center text-xs text-[#8892A4] mt-4">
          ⚡ Extraction en temps réel · moins de 5 secondes
        </p>
      </motion.div>
    </div>
  </section>
);

export default AIScan;
