import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const FinalCTA = () => (
  <section className="py-24 px-5">
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="max-w-3xl mx-auto text-center rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-10 sm:p-16 relative overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#8DD621]/10 blur-[80px]" />
      <div className="relative z-10">
        <Smartphone className="w-10 h-10 text-[#8DD621] mx-auto mb-6" />
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-4">
          Prêt à voir clair dans ton jeton ?
        </h2>
        <p className="text-[#79847E] mb-8 max-w-md mx-auto">
          Télécharge Mon Jeton maintenant et prends le contrôle de tes finances.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="https://play.google.com/store/apps/details?id=monjeton" target="_blank" rel="noopener noreferrer">
            <Button className="w-full sm:w-auto bg-[#8DD621] text-[#151C18] font-bold px-8 h-12 hover:bg-[#8DD621]/90 shadow-[0_0_30px_rgba(141,214,33,0.25)]">
              📱 Android
            </Button>
          </a>
          <a href="https://apps.apple.com/app/monjeton" target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 border-[rgba(255,255,255,0.08)] text-[#D5D7D6] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              🍎 iPhone
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  </section>
);

export default FinalCTA;
