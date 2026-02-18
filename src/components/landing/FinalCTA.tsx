import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTA = () => (
  <section className="py-24 px-5">
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="max-w-3xl mx-auto text-center rounded-3xl bg-[rgba(124,255,58,0.04)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[22px] p-10 sm:p-16 relative overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[rgba(124,255,58,0.08)] blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[rgba(61,255,154,0.06)] blur-[60px]" />
      <div className="relative z-10">
        <Zap className="w-10 h-10 text-[#7CFF3A] mx-auto mb-6" />
        <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-4">
          Prêt à voir clair dans ton jeton ?
        </h2>
        <p className="text-[rgba(234,251,234,0.72)] mb-8 max-w-md mx-auto">
          Créez votre compte maintenant et prenez le contrôle de vos finances.
        </p>
        <Link to="/signup">
          <Button className="bg-[#7CFF3A] text-[#05070A] font-bold px-10 h-12 text-base hover:bg-[#7CFF3A]/90 shadow-[0_0_30px_rgba(124,255,58,0.3)] transition-shadow hover:shadow-[0_0_40px_rgba(124,255,58,0.5)]">
            Créer un compte
          </Button>
        </Link>
      </div>
    </motion.div>
  </section>
);

export default FinalCTA;
