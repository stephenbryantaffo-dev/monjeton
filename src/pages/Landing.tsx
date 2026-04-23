import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SectionReveal from "@/components/landing/SectionReveal";
import AnimatedSectionBackground from "@/components/landing/AnimatedSectionBackground";
import FloatingFCFA from "@/components/landing/FloatingFCFA";
import GlobalDigitalEffects from "@/components/landing/GlobalDigitalEffects";

const Stats = lazy(() => import("@/components/landing/Stats"));
const Features = lazy(() => import("@/components/landing/Features"));
const ForWhoSection = lazy(() => import("@/components/landing/ForWhoSection"));
const AIScan = lazy(() => import("@/components/landing/AIScan"));
const Enterprise = lazy(() => import("@/components/landing/Enterprise"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));
const FAQ = lazy(() => import("@/components/landing/FAQ"));
const FinalCTA = lazy(() => import("@/components/landing/FinalCTA"));

const SectionFallback = () => (
  <div className="min-h-[200px] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#05070A] relative" style={{ isolation: "isolate" }}>
      <GlobalDigitalEffects />
      <FloatingFCFA />
      <Navbar />
      <Hero />
      {/* Seamless transition handled by gradient overlay on Hero bottom */}


      <AnimatedSectionBackground variant={0} glow glowBottom>
        <SectionReveal><Suspense fallback={<SectionFallback />}><Stats /></Suspense></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={1} glow>
        <SectionReveal><Suspense fallback={<SectionFallback />}><Features /></Suspense></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={2} glow glowBottom>
        <SectionReveal><Suspense fallback={<SectionFallback />}><AIScan /></Suspense></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={0} glow>
        <SectionReveal><Suspense fallback={<SectionFallback />}><Enterprise /></Suspense></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={1} glow glowBottom>
        <SectionReveal><Suspense fallback={<SectionFallback />}><Pricing /></Suspense></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={2} glow>
        <SectionReveal><Suspense fallback={<SectionFallback />}><FAQ /></Suspense></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={0} glow glowBottom>
        <SectionReveal><Suspense fallback={<SectionFallback />}><FinalCTA /></Suspense></SectionReveal>
      </AnimatedSectionBackground>
    </div>
  );
};

export default Landing;
