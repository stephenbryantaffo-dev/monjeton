import { motion } from "framer-motion";
import { Building2, UserPlus, Receipt, Shield, MessageCircle, Link2 } from "lucide-react";

const items = [
  { icon: UserPlus, title: "Ajout de collaborateurs", desc: "Invitez votre équipe en quelques clics." },
  { icon: Receipt, title: "Dépenses partagées", desc: "Suivez les dépenses de toute l'équipe en temps réel." },
  { icon: Shield, title: "Historique des modifications", desc: "Audit log complet de toutes les actions." },
  { icon: MessageCircle, title: "Chat intégré", desc: "Communiquez directement dans l'espace entreprise." },
  { icon: Link2, title: "Invitations par lien + code", desc: "Partagez un lien ou un code unique pour rejoindre." },
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(124,255,58,0.1)] text-[#7CFF3A] text-xs font-semibold mb-6 border border-[rgba(124,255,58,0.18)]">
          <Building2 className="w-3.5 h-3.5" />
          Pour les équipes
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-4">
          Mode Entreprise : travaillez en équipe
        </h2>
        <p className="text-[rgba(234,251,234,0.72)] max-w-lg mx-auto">
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
            whileHover={{ y: -4, boxShadow: "0 0 25px rgba(124,255,58,0.1)" }}
            className="rounded-2xl bg-[rgba(124,255,58,0.03)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[22px] p-6 hover:border-[rgba(124,255,58,0.35)] transition-all"
          >
            <item.icon className="w-6 h-6 text-[#7CFF3A] mb-3" />
            <h3 className="text-[#EAFBEA] font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-[rgba(234,251,234,0.72)]">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Enterprise;
