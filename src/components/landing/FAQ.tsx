import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Est-ce que Mon Jeton est gratuit ?",
    a: "Oui, la version gratuite te permet de suivre tes dépenses avec 1 portefeuille et 50 transactions par mois. Pour des fonctionnalités avancées, découvre nos plans Pro et Ultra Pro.",
  },
  {
    q: "Comment fonctionne le scan IA ?",
    a: "Tu prends en photo ta facture ou ta capture d'écran Mobile Money. Notre IA détecte automatiquement le marchand, le montant, la devise et la date, puis crée la transaction pour toi.",
  },
  {
    q: "Quels moyens de paiement sont supportés ?",
    a: "Mon Jeton supporte Orange Money, MTN MoMo, Wave, Moov Money, ainsi que les cartes Visa et Mastercard.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Absolument. Toutes tes données sont chiffrées et stockées de manière sécurisée. Nous ne partageons jamais tes informations financières avec des tiers.",
  },
  {
    q: "Le mode entreprise, c'est quoi ?",
    a: "Le mode entreprise te permet de créer un espace de travail partagé avec ton équipe. Tu peux inviter des membres, suivre les dépenses communes, consulter l'historique d'audit et communiquer via le chat intégré.",
  },
  {
    q: "Est-ce que la conversion de devises est automatique ?",
    a: "Oui ! Si tu scannes une facture en dollars, euros ou toute autre devise, Mon Jeton convertit automatiquement le montant en FCFA avec le taux du jour.",
  },
];

const FAQ = () => (
  <section id="faq" className="py-24 px-5">
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-[#D5D7D6] mb-4">Questions fréquentes</h2>
      </motion.div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <AccordionItem
              value={`item-${i}`}
              className="rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-5 data-[state=open]:border-[#8DD621]/30"
            >
              <AccordionTrigger className="text-[#D5D7D6] text-sm font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#79847E] leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQ;
