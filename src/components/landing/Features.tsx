import { motion } from "framer-motion";
import {
  Mic,
  ScanLine,
  Sparkles,
  Users,
  PiggyBank,
  Wallet,
  Target,
  TrendingUp,
  Receipt,
  WifiOff,
  EyeOff,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Saisie Vocale IA",
    desc: "Dites « J'ai payé taxi 3 000 francs » pendant que vous montez dans la voiture. C'est enregistré avant d'arriver.",
  },
  {
    icon: ScanLine,
    title: "Scan OCR",
    desc: "Votre ticket de caisse devient une transaction propre, catégorisée et archivée — en 5 secondes, photo comprise.",
  },
  {
    icon: Sparkles,
    title: "Assistant Claude",
    desc: "« Combien j'ai dépensé en transport ce mois ? » — Réponse instantanée, en FCFA, basée sur vos vraies données.",
  },
  {
    icon: Users,
    title: "Tontine Intelligente",
    desc: "Fini les tableaux Excel et les disputes. Chaque membre voit ce qu'il doit, vous voyez qui a payé.",
  },
  {
    icon: PiggyBank,
    title: "Caisse Commune",
    desc: "Pour le terrain, la fête ou l'urgence. Chacun cotise, tout le monde voit le solde. Aucune mauvaise surprise.",
  },
  {
    icon: Wallet,
    title: "Multi-Portefeuilles",
    desc: "4 opérateurs, un seul tableau de bord. Vous savez exactement où est votre argent à tout moment.",
  },
  {
    icon: Target,
    title: "Budgets Intelligents",
    desc: "Mon Jeton vous prévient avant que vous dépassiez — pas après. L'IA suggère une répartition basée sur vos habitudes.",
  },
  {
    icon: TrendingUp,
    title: "Objectifs d'Épargne",
    desc: "Fixez un objectif. Mon Jeton calcule combien économiser par jour. Versez quand vous pouvez. L'app suit tout.",
  },
  {
    icon: Receipt,
    title: "Mes Reçus Sécurisés",
    desc: "Chaque reçu confirmé est stocké dans le cloud, protégé par PIN, exportable en PDF. Vos preuves toujours disponibles.",
  },
  {
    icon: WifiOff,
    title: "Mode Hors-Ligne",
    desc: "Le réseau coupe ? Mon Jeton continue. Vos transactions attendent en local et synchronisent dès que la connexion revient.",
  },
  {
    icon: EyeOff,
    title: "PIN & Mode Discret",
    desc: "Quelqu'un regarde votre écran ? Un tap masque tous les montants. Votre argent reste votre affaire.",
  },
  {
    icon: Brain,
    title: "Score Financier IA",
    desc: "Chaque semaine, Claude analyse vos dépenses et vous donne UN conseil concret pour mieux gérer la semaine suivante.",
  },
];

const Features = () => (
  <section id="features" data-demo="true" className="py-16 sm:py-24 px-4 sm:px-5" style={{ scrollMarginTop: 80 }}>
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#EAFBEA] mb-4 font-syne">
          Tout ce dont vous avez besoin.
        </h2>
        <p className="text-[rgba(234,251,234,0.72)] max-w-xl mx-auto">
          Pas une app de plus. L'app qui remplace toutes les autres — pour votre argent mobile money, vos groupes et vos projets.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 3) * 0.1 }}
            whileHover={{ y: -6, boxShadow: "0 0 30px rgba(124,255,58,0.12)" }}
            className="group rounded-2xl bg-[rgba(124,255,58,0.03)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[22px] p-5 sm:p-8 hover:border-[rgba(124,255,58,0.4)] transition-all"
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
