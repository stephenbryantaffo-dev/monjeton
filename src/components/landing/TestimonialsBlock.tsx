import { motion } from "framer-motion";
import MarkerText from "./MarkerText";

const testimonials = [
  {
    quote: "Depuis Mon Jeton, je sais enfin où part mon argent chaque mois. Les tontines gérées toutes seules, un vrai soulagement.",
    initial: "A",
    name: "Aminata K.",
    role: "Maman, Abidjan",
  },
  {
    quote: "Je note mes ventes à la voix pendant que je sers les clients. Le scan des factures me fait gagner un temps fou.",
    initial: "Y",
    name: "Yao B.",
    role: "Commerçant, Adjamé",
  },
  {
    quote: "J'ai atteint mon objectif d'épargne pour mon téléphone en 4 mois. L'appli me motive vraiment à mettre de côté.",
    initial: "F",
    name: "Fatou D.",
    role: "Étudiante, Cocody",
  },
];

const TestimonialsBlock = () => (
  <section className="py-16 sm:py-20 px-4 sm:px-5 border-t border-[rgba(124,255,58,0.06)] relative z-10">
    <div className="max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7CFF3A] bg-[rgba(124,255,58,0.08)] border border-[rgba(124,255,58,0.2)] px-3.5 py-1.5 rounded-full mb-4">
          Témoignages
        </span>
        <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-[1.05] text-[#EAFBEA]">
          Ils gèrent mieux leur <MarkerText variant="lime">argent</MarkerText>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-[rgba(13,21,18,0.6)] border border-[rgba(124,255,58,0.12)] rounded-2xl p-5 sm:p-6 backdrop-blur-md"
          >
            <div className="text-[#fbbf24] tracking-[2px] text-[13px] mb-3">★★★★★</div>
            <p className="text-[14px] leading-[1.55] text-[rgba(234,251,234,0.85)] mb-4">« {t.quote} »</p>
            <div className="flex items-center gap-2.5">
              <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#7CFF3A] to-[#3DFF9A] text-[#04060A] flex items-center justify-center font-extrabold text-sm">
                {t.initial}
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#EAFBEA]">{t.name}</div>
                <div className="text-[11px] text-[rgba(234,251,234,0.5)]">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsBlock;
