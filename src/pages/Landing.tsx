import { lazy, Suspense } from "react";
import Hero from "@/components/landing/Hero";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const Navbar = lazy(() => import("@/components/landing/Navbar"));
const Footer = lazy(() => import("@/components/landing/Footer"));
const SectionReveal = lazy(() => import("@/components/landing/SectionReveal"));
const AnimatedSectionBackground = lazy(() => import("@/components/landing/AnimatedSectionBackground"));
const PaymentMarquee = lazy(() => import("@/components/landing/PaymentMarquee"));
const FloatingFCFA = lazy(() => import("@/components/landing/FloatingFCFA"));
const GlobalDigitalEffects = lazy(() => import("@/components/landing/GlobalDigitalEffects"));

const FeatureShowcase = lazy(() => import("@/components/landing/FeatureShowcase"));
const Personas = lazy(() => import("@/components/landing/Personas"));
const TestimonialsBlock = lazy(() => import("@/components/landing/TestimonialsBlock"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));

const Landing = () => {
  useDocumentMeta({
    title: "Mon Jeton — Gestion financière en FCFA pour l'Afrique de l'Ouest",
    description: "Suivez vos dépenses, revenus, budgets, épargne et dettes en Franc CFA. Scan IA des reçus Mobile Money (Orange, MTN, Wave, Moov).",
    path: "/",
  });
  return (
    <div className="min-h-screen bg-[#14171C] relative" style={{ isolation: "isolate" }}>
      <div className="grid-bg" aria-hidden="true" />
      <div className="relative" style={{ zIndex: 1 }}>
        <Suspense fallback={null}>
          <GlobalDigitalEffects />
        </Suspense>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <Hero />

        <div className="relative">
          <Suspense fallback={null}>
            <FloatingFCFA />
            <PaymentMarquee />

            <AnimatedSectionBackground variant={0} glow>
              <SectionReveal><FeatureShowcase /></SectionReveal>
            </AnimatedSectionBackground>

            <AnimatedSectionBackground variant={1} glow>
              <SectionReveal><Personas /></SectionReveal>
            </AnimatedSectionBackground>

            <AnimatedSectionBackground variant={2} glow>
              <SectionReveal><TestimonialsBlock /></SectionReveal>
            </AnimatedSectionBackground>

            <AnimatedSectionBackground variant={0} glow glowBottom>
              <SectionReveal><Pricing /></SectionReveal>
            </AnimatedSectionBackground>

            <Footer />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Landing;
