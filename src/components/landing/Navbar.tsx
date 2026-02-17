import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "IA Scan", href: "#ai-scan" },
  { label: "Mode Entreprise", href: "#enterprise" },
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
          ? "bg-[#151C18]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8DD621] flex items-center justify-center">
            <span className="text-[#151C18] font-black text-sm">MJ</span>
          </div>
          <span className="text-lg font-bold text-[#D5D7D6]">Mon Jeton</span>
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-[#79847E] hover:text-[#8DD621] transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#79847E] hover:text-[#D5D7D6] hover:bg-[rgba(255,255,255,0.04)]"
            onClick={() => scrollTo("#hero")}
          >
            Voir la démo
          </Button>
          <a href="https://play.google.com/store/apps/details?id=monjeton" target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="bg-[#8DD621] text-[#151C18] font-bold hover:bg-[#8DD621]/90 shadow-[0_0_30px_rgba(141,214,33,0.25)]"
            >
              Télécharger
            </Button>
          </a>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden text-[#D5D7D6]" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#151C18]/95 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)]"
          >
            <div className="flex flex-col px-5 py-4 gap-4">
              {navLinks.map((l) => (
                <button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  className="text-left text-[#79847E] hover:text-[#8DD621] transition-colors"
                >
                  {l.label}
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <a href="https://play.google.com/store/apps/details?id=monjeton" target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button className="w-full bg-[#8DD621] text-[#151C18] font-bold hover:bg-[#8DD621]/90">
                    Télécharger
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
