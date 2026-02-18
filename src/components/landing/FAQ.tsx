import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Comment fonctionne la conversion de devises ?",
    a: "Mon Jeton détecte automatiquement la devise sur vos factures et reçus. Si le montant est en USD, EUR ou toute autre devise, il est converti en FCFA au taux du jour en temps réel.",
  },
  {
    q: "Comment fonctionne le scan IA ?",
    a: "Prenez en photo votre facture ou capture d'écran Mobile Money. Notre IA détecte le marchand, le montant, la devise et la date, puis crée la transaction automatiquement.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Absolument. Toutes vos données sont chiffrées de bout en bout et stockées de manière sécurisée. Nous ne partageons jamais vos informations financières avec des tiers.",
  },
  {
    q: "Le mode entreprise, c'est quoi ?",
    a: "Le mode entreprise permet de créer un espace de travail partagé avec votre équipe. Invitez des membres, suivez les dépenses communes, consultez l'historique d'audit et communiquez via le chat intégré.",
  },
  {
    q: "Mon Jeton est-il disponible sur mobile ?",
    a: "Oui ! Mon Jeton est disponible sur Android et iOS. Vous pouvez aussi utiliser l'application web depuis n'importe quel navigateur.",
  },
  {
    q: "Quels moyens de paiement sont supportés ?",
    a: "Mon Jeton supporte Orange Money, MTN MoMo, Wave, Moov Money, ainsi que les cartes Visa et Mastercard.",
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
        <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-4">Questions fréquentes</h2>
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
              className="rounded-xl bg-[rgba(124,255,58,0.03)] border border-[rgba(124,255,58,0.18)] px-5 data-[state=open]:border-[rgba(124,255,58,0.4)] backdrop-blur-[18px]"
            >
              <AccordionTrigger className="text-[#EAFBEA] text-sm font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[rgba(234,251,234,0.72)] leading-relaxed">
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
