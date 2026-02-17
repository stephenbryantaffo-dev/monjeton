import { motion } from "framer-motion";

const platforms = [
  "Orange Money",
  "MTN MoMo",
  "Wave",
  "Moov Money",
  "Visa",
  "Mastercard",
];

const Platforms = () => (
  <section className="py-20 px-5">
    <div className="max-w-5xl mx-auto text-center">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-sm text-[#79847E] mb-8"
      >
        Compatible avec les paiements du quotidien en Afrique.
      </motion.p>
      <div className="flex flex-wrap justify-center gap-4">
        {platforms.map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="px-6 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-[#D5D7D6] font-medium hover:border-[#8DD621]/30 transition-colors"
          >
            {p}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Platforms;
