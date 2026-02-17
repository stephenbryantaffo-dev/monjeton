import { motion } from "framer-motion";
import { TrendingUp, Tags, BarChart3, ScanLine, ArrowLeftRight, Users } from "lucide-react";

const features = [
  { icon: TrendingUp, title: "Suivi automatique des dépenses", desc: "Chaque transaction est enregistrée et classée sans effort." },
  { icon: Tags, title: "Catégorisation intelligente", desc: "L'IA classe automatiquement tes dépenses par catégorie." },
  { icon: BarChart3, title: "Rapports semaine / mois / année", desc: "Des graphiques clairs pour comprendre où va ton argent." },
  { icon: ScanLine, title: "IA Scan factures + reçus", desc: "Scanne une facture ou un reçu et l'IA extrait les infos." },
  { icon: ArrowLeftRight, title: "Détection de devise + conversion FCFA", desc: "Montants en devises étrangères convertis automatiquement." },
  { icon: Users, title: "Mode entreprise", desc: "Équipe, dépenses partagées et chat intégré pour les pros." },
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
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-4">
          Tout ce qu'il te faut pour gérer ton argent
        </h2>
        <p className="text-[#79847E] max-w-xl mx-auto">
          Des outils puissants pensés pour l'Afrique, accessibles à tous.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="group rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-6 hover:border-[#8DD621]/30 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#8DD621]/10 flex items-center justify-center mb-4 group-hover:bg-[#8DD621]/20 transition-colors">
              <f.icon className="w-5 h-5 text-[#8DD621]" />
            </div>
            <h3 className="text-[#D5D7D6] font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-[#79847E] leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
