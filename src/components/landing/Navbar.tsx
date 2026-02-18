import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Scan AI", href: "#ai-scan" },
  { label: "Sécurité", href: "#enterprise" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
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
          <div className="w-8 h-8 rounded-lg bg-[#7CFF3A] flex items-center justify-center shadow-[0_0_20px_rgba(124,255,58,0.4)]">
            <span className="text-[#05070A] font-black text-sm">MJ</span>
          </div>
          <span className="text-lg font-bold text-[#EAFBEA]">Mon Jeton</span>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-[rgba(234,251,234,0.72)] hover:text-[#7CFF3A] transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-[rgba(234,251,234,0.72)] hover:text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.06)]"
            onClick={() => scrollTo("#hero")}
          >
            Voir la démo
          </Button>
          <Link to="/signup">
            <Button
              size="sm"
              className="bg-[#7CFF3A] text-[#05070A] font-bold hover:bg-[#7CFF3A]/90 shadow-[0_0_25px_rgba(124,255,58,0.3)]"
            >
              Créer un compte
            </Button>
          </Link>
        </div>

        <button className="lg:hidden text-[#EAFBEA]" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#05070A]/95 backdrop-blur-[22px] border-b border-[rgba(124,255,58,0.12)]"
          >
            <div className="flex flex-col px-5 py-4 gap-4">
              {navLinks.map((l) => (
                <button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  className="text-left text-[rgba(234,251,234,0.72)] hover:text-[#7CFF3A] transition-colors"
                >
                  {l.label}
                </button>
              ))}
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
    </motion.nav>
  );
};

export default Navbar;
