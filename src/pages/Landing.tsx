import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import AIScan from "@/components/landing/AIScan";
import Enterprise from "@/components/landing/Enterprise";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import SectionReveal from "@/components/landing/SectionReveal";
import AnimatedSectionBackground from "@/components/landing/AnimatedSectionBackground";
import FloatingFCFA from "@/components/landing/FloatingFCFA";
import GlobalDigitalEffects from "@/components/landing/GlobalDigitalEffects";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#05070A] relative" style={{ isolation: "isolate" }}>
      <GlobalDigitalEffects />
      <FloatingFCFA />
      <Navbar />
      <Hero />
      {/* Seamless fade bridge: eliminates the visual seam between Hero bottom and first section */}
      <div className="h-16 -mt-16 relative z-20 bg-gradient-to-b from-transparent to-[#05070A] pointer-events-none" />

      <AnimatedSectionBackground variant={0} glow glowBottom>
        <SectionReveal><Stats /></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={1} glow>
        <SectionReveal><Features /></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={2} glow glowBottom>
        <SectionReveal><AIScan /></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={0} glow>
        <SectionReveal><Enterprise /></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={1} glow glowBottom>
        <SectionReveal><Pricing /></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={2} glow>
        <SectionReveal><FAQ /></SectionReveal>
      </AnimatedSectionBackground>

      <AnimatedSectionBackground variant={0} glow glowBottom>
        <SectionReveal><FinalCTA /></SectionReveal>
      </AnimatedSectionBackground>
    </div>
  );
};

export default Landing;
