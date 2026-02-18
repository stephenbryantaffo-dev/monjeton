import { motion } from "framer-motion";
import { Users, TrendingUp, ShieldCheck } from "lucide-react";

const stats = [
  { icon: Users, value: "+10 000", label: "utilisateurs", suffix: "" },
  { icon: TrendingUp, value: "+2M", label: "FCFA suivis / mois", suffix: "" },
  { icon: ShieldCheck, value: "99.9%", label: "fiabilité", suffix: "" },
];

const Stats = () => (
  <section className="py-20 px-5 relative z-10">
    <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-5">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl bg-[rgba(124,255,58,0.04)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[22px] p-6 text-center hover:border-[rgba(124,255,58,0.35)] transition-colors"
        >
          <s.icon className="w-6 h-6 text-[#7CFF3A] mx-auto mb-3" />
          <div className="text-3xl font-black text-[#EAFBEA] mb-1">{s.value}</div>
          <div className="text-sm text-[rgba(234,251,234,0.72)]">{s.label}</div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default Stats;
