import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Layers, ScanLine, Shield, CreditCard, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/ui/tubelight-navbar";
import logoImg from "@/assets/logo-monjeton.png";

const tubelightItems = [
  { name: "Fonctionnalités", url: "#features", icon: Layers, onClick: () => scrollToEl("#features") },
  { name: "Scan AI", url: "#ai-scan", icon: ScanLine, onClick: () => scrollToEl("#ai-scan") },
  { name: "Sécurité", url: "#enterprise", icon: Shield, onClick: () => scrollToEl("#enterprise") },
  { name: "Tarifs", url: "#pricing", icon: CreditCard, onClick: () => scrollToEl("#pricing") },
  { name: "FAQ", url: "#faq", icon: HelpCircle, onClick: () => scrollToEl("#faq") },
];

function scrollToEl(href: string) {
  const el = document.querySelector(href);
  el?.scrollIntoView({ behavior: "smooth" });
}

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top bar with logo + CTA */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#05070A]/70 backdrop-blur-[22px] border-b border-[rgba(124,255,58,0.12)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
            <span className="text-lg font-bold text-[#EAFBEA]">Mon Jeton</span>
          </Link>

          {/* Desktop: tubelight nav centered */}
          <div className="hidden lg:block">
            <NavBar items={tubelightItems} className="!fixed !top-0 !mb-0 !pt-3" />
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[rgba(234,251,234,0.72)] hover:text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.06)]"
            >
              <Link to="/login">Se connecter</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A]/90 shadow-[0_0_25px_rgba(124,255,58,0.3)]"
            >
              <Link to="/signup">Créer un compte</Link>
            </Button>
          </div>

          <button className="lg:hidden text-[#EAFBEA]" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile: tubelight nav at bottom */}
      <div className="lg:hidden">
        <NavBar items={tubelightItems} className="!mb-4 !pt-0" />
      </div>

      {/* Mobile dropdown fallback */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-[72px] left-0 right-0 z-50 lg:hidden bg-[#05070A]/95 backdrop-blur-[22px] border-b border-[rgba(124,255,58,0.12)]"
          >
            <div className="flex flex-col px-5 py-4 gap-4">
              <div className="flex gap-3 pt-2">
                <Link to="/signup" className="flex-1">
                  <Button className="w-full bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A]/90">
                    Créer un compte
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
