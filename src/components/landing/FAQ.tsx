import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLandingT } from "@/hooks/useLandingT";

const FAQ = () => {
  const { lt } = useLandingT();
  return (
    <section id="faq" className="py-24 px-5">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#EAFBEA] mb-4">
            {lt.faq_title}
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {lt.faqs.map((faq, i) => (
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
};

export default FAQ;
