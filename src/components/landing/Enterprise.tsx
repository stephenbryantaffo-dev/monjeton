import { motion } from "framer-motion";
import { Building2, UserPlus, Receipt, Shield, MessageCircle } from "lucide-react";

const items = [
  { icon: Building2, title: "Workspace société", desc: "Créez un espace dédié pour votre entreprise." },
  { icon: UserPlus, title: "Inviter votre équipe", desc: "Ajoutez vos collaborateurs en quelques clics." },
  { icon: Receipt, title: "Dépenses partagées", desc: "Suivez les dépenses de toute l'équipe en temps réel." },
  { icon: Shield, title: "Audit log", desc: "Historique complet de toutes les actions." },
  { icon: MessageCircle, title: "Chat intégré", desc: "Communiquez directement dans l'application." },
];

const Enterprise = () => (
  <section id="enterprise" className="py-24 px-5">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-4">
          Mode entreprise : suivez l'argent à plusieurs.
        </h2>
        <p className="text-[#79847E] max-w-lg mx-auto">
          Gérez les finances de votre équipe avec transparence et efficacité.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-6"
          >
            <item.icon className="w-6 h-6 text-[#8DD621] mb-3" />
            <h3 className="text-[#D5D7D6] font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-[#79847E]">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Enterprise;
