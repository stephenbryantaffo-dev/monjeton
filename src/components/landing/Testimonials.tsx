import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Aminata Koné",
    role: "Commerçante, Abidjan",
    text: "Depuis que j'utilise Mon Jeton, je sais exactement où part mon argent. Le scan de reçus Orange Money me fait gagner un temps fou !",
  },
  {
    name: "Moussa Diallo",
    role: "Freelance, Dakar",
    text: "Le mode entreprise est parfait pour gérer les dépenses de mon équipe. Et la conversion FCFA automatique, c'est magique.",
  },
  {
    name: "Fatoumata Traoré",
    role: "Mère de famille, Bamako",
    text: "Je recommande Mon Jeton à toutes les mamans ! Les rapports mensuels m'aident à mieux planifier le budget de la maison.",
  },
];

const Testimonials = () => (
  <section className="py-24 px-5">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-4">
          Ils nous font confiance
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-6"
          >
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-[#8DD621] text-[#8DD621]" />
              ))}
            </div>
            <p className="text-sm text-[#D5D7D6] leading-relaxed mb-4">"{t.text}"</p>
            <div>
              <div className="text-sm font-semibold text-[#D5D7D6]">{t.name}</div>
              <div className="text-xs text-[#79847E]">{t.role}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
