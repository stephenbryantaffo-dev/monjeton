import { motion } from "framer-motion";
import { Home, Store, Smartphone, Briefcase } from "lucide-react";
import MarkerText from "./MarkerText";

const personas = [
  { icon: Home, title: "Mamans", desc: "Gérez le budget du foyer, les tontines et les dépenses des enfants, sans stress." },
  { icon: Store, title: "Commerçants", desc: "Suivez vos entrées, vos sorties et vos crédits clients au quotidien, à la voix." },
  { icon: Smartphone, title: "Jeunes", desc: "Prenez de bonnes habitudes tôt : épargne, budget et objectifs, direct sur ton tel." },
  { icon: Briefcase, title: "Entrepreneurs", desc: "Pilotez la trésorerie de votre activité et anticipez avec des rapports clairs." },
];

const Personas = () => (
  <section className="py-16 sm:py-20 px-4 sm:px-5 border-t border-[rgba(124,255,58,0.06)] relative z-10">
    <div className="max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7CFF3A] bg-[rgba(124,255,58,0.08)] border border-[rgba(124,255,58,0.2)] px-3.5 py-1.5 rounded-full mb-4">
          Pour qui ?
        </span>
        <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-[1.05] text-[#EAFBEA]">
          Pensé pour <MarkerText variant="lime">vous</MarkerText>
        </h2>
        <p className="text-[rgba(234,251,234,0.6)] mt-3 text-[15px] leading-relaxed">
          Que vous gériez un foyer, une boutique ou une entreprise, Mon Jeton s'adapte à votre réalité.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {personas.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-white/[0.02] border border-[rgba(124,255,58,0.12)] rounded-2xl p-5 sm:p-6 hover:border-[rgba(124,255,58,0.35)] hover:bg-[rgba(124,255,58,0.04)] transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-[rgba(124,255,58,0.12)] flex items-center justify-center mb-3.5">
              <p.icon className="w-5 h-5 text-[#7CFF3A]" strokeWidth={2} />
            </div>
            <h3 className="text-base font-extrabold text-[#EAFBEA] mb-1.5">{p.title}</h3>
            <p className="text-[13px] text-[rgba(234,251,234,0.6)] leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Personas;
