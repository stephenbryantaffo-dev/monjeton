import { motion } from "framer-motion";
import { Wallet, ArrowLeftRight, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Suivi des dépenses en FCFA",
    desc: "Chaque transaction est enregistrée, catégorisée et analysée automatiquement pour vous donner une vision claire de vos finances.",
  },
  {
    icon: ArrowLeftRight,
    title: "Conversion automatique USD/EUR vers FCFA",
    desc: "Scannez une facture en dollars ou en euros. Mon Jeton détecte la devise et convertit instantanément au taux du jour.",
  },
  {
    icon: BarChart3,
    title: "Rapports clairs : semaine / mois / année",
    desc: "Des graphiques intuitifs pour comprendre vos habitudes de dépenses et mieux planifier votre budget.",
  },
];

const Features = () => (
  <section id="features" className="py-24 px-5">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-4">
          Tout ce qu'il vous faut pour gérer votre argent
        </h2>
        <p className="text-[rgba(234,251,234,0.72)] max-w-xl mx-auto">
          Des outils puissants pensés pour l'Afrique, accessibles à tous.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -6, boxShadow: "0 0 30px rgba(124,255,58,0.12)" }}
            className="group rounded-2xl bg-[rgba(124,255,58,0.03)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[22px] p-8 hover:border-[rgba(124,255,58,0.4)] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-[rgba(124,255,58,0.1)] flex items-center justify-center mb-5 group-hover:bg-[rgba(124,255,58,0.2)] transition-colors">
              <f.icon className="w-6 h-6 text-[#7CFF3A]" />
            </div>
            <h3 className="text-[#EAFBEA] font-semibold text-lg mb-3">{f.title}</h3>
            <p className="text-sm text-[rgba(234,251,234,0.72)] leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
