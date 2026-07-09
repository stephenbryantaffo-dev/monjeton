import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import logoImg from "@/assets/logo-monjeton.webp";

const navItems = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Pour qui ?", href: "#for-who" },
  { label: "Scan AI", href: "#ai-scan" },
  { label: "Sécurité", href: "#enterprise" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const NAVBAR_OFFSET = 72;

const scrollToAnchor = (href: string) => {
  const el = document.querySelector(href) as HTMLElement | null;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
};

const handleAnchorClick = (
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onDone?: () => void,
) => {
  if (href.startsWith("#")) {
    e.preventDefault();
    onDone?.();
    // Defer scroll until after the mobile menu collapses to avoid interference
    window.setTimeout(() => scrollToAnchor(href), 60);
  }
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-[rgba(124,255,58,0.12)]"
          : "border-transparent"
      }`}
      style={{
        background: scrolled ? "rgba(5,7,10,0.85)" : "rgba(5,7,10,0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4 flex-nowrap">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src={logoImg}
            alt="Mon Jeton"
            className="h-9 w-auto rounded-lg flex-shrink-0"
            loading="lazy"
          />
          <span className="font-black text-lg text-[#EAFBEA] whitespace-nowrap hidden sm:block">
            Mon Jeton
          </span>
        </Link>

        {/* Liens desktop (>= lg) */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center flex-nowrap overflow-hidden">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className="whitespace-nowrap px-3 py-2 rounded-lg text-xs xl:text-sm font-medium text-[rgba(234,251,234,0.72)] hover:text-[#7CFF3A] hover:bg-[rgba(124,255,58,0.08)] transition-all duration-200"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA desktop */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <Link
            to="/login"
            className="text-sm font-medium text-[rgba(234,251,234,0.72)] hover:text-[#EAFBEA] transition px-3 py-2 whitespace-nowrap"
          >
            Se connecter
          </Link>
          <Link
            to="/signup"
            className="bg-[#7CFF3A] text-[#05070A] font-bold text-sm px-4 py-2 rounded-full hover:scale-105 transition-transform whitespace-nowrap shadow-[0_0_25px_rgba(124,255,58,0.3)]"
          >
            S'inscrire →
          </Link>
        </div>

        {/* Hamburger (< lg) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="lg:hidden w-10 h-10 rounded-xl border border-[rgba(124,255,58,0.18)] bg-[rgba(124,255,58,0.04)] flex items-center justify-center flex-shrink-0"
        >
          {menuOpen ? (
            <X className="w-5 h-5 text-[#EAFBEA]" />
          ) : (
            <Menu className="w-5 h-5 text-[#EAFBEA]" />
          )}
        </button>
      </div>

      {/* Menu mobile/tablette déroulant */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-[rgba(124,255,58,0.12)] overflow-hidden"
            style={{ background: "rgba(5,7,10,0.97)" }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    setMenuOpen(false);
                    handleAnchorClick(e, item.href);
                  }}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[rgba(234,251,234,0.72)] hover:text-[#7CFF3A] hover:bg-[rgba(124,255,58,0.08)] transition-all whitespace-nowrap"
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-[rgba(124,255,58,0.12)] pt-3 mt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-center py-3 rounded-xl border border-[rgba(124,255,58,0.18)] bg-[rgba(124,255,58,0.04)] text-sm font-medium text-[#EAFBEA]"
                >
                  Se connecter
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="text-center py-3 rounded-xl bg-[#7CFF3A] text-[#05070A] font-bold text-sm shadow-[0_0_25px_rgba(124,255,58,0.3)]"
                >
                  S'inscrire →
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
