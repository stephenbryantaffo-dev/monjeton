import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Platforms from "@/components/landing/Platforms";
import Features from "@/components/landing/Features";
import AIScan from "@/components/landing/AIScan";
import Enterprise from "@/components/landing/Enterprise";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#151C18]">
      <Navbar />
      <Hero />
      <Platforms />
      <Features />
      <AIScan />
      <Enterprise />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Landing;
