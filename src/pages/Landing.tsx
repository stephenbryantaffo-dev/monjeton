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

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#05070A]">
      <Navbar />
      <Hero />
      <SectionReveal><Stats /></SectionReveal>
      <SectionReveal><Features /></SectionReveal>
      <SectionReveal><AIScan /></SectionReveal>
      <SectionReveal><Enterprise /></SectionReveal>
      <SectionReveal><Pricing /></SectionReveal>
      <SectionReveal><FAQ /></SectionReveal>
      <SectionReveal><FinalCTA /></SectionReveal>
    </div>
  );
};

export default Landing;
