import { Separator } from "@/components/ui/separator";
import logoImg from "@/assets/logo-monjeton.png";

const Footer = () => (
  <footer className="py-12 px-5 border-t border-[rgba(255,255,255,0.08)]">
    <div className="max-w-6xl mx-auto">
      <div className="grid sm:grid-cols-3 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoImg} alt="Mon Jeton" className="h-8 w-auto rounded-md" loading="lazy" />
            <span className="font-bold text-[#D5D7D6]">Mon Jeton</span>
          </div>
          <p className="text-sm text-[#79847E] italic">"Tu vas voir clair dans ton jeton."</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#D5D7D6] mb-3">Liens</h4>
          <ul className="space-y-2 text-sm text-[#79847E]">
            <li><a href="#features" className="hover:text-[#8DD621] transition-colors">Fonctionnalités</a></li>
            <li><a href="#pricing" className="hover:text-[#8DD621] transition-colors">Tarifs</a></li>
            <li><a href="#faq" className="hover:text-[#8DD621] transition-colors">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#D5D7D6] mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-[#79847E]">
            <li>contact@track-emoney.com</li>
            <li>+225 00 00 00 00</li>
            <li>🌍 Côte d'Ivoire</li>
          </ul>
        </div>
      </div>
      <Separator className="bg-[rgba(255,255,255,0.06)]" />
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-[#79847E]">© 2026 Djaitech. Tous droits réservés.</p>
        <div className="flex gap-4">
          <a href="/privacy" className="text-xs text-[#79847E] hover:text-[#8DD621] transition-colors">Confidentialité</a>
          <a href="/terms" className="text-xs text-[#79847E] hover:text-[#8DD621] transition-colors">CGU</a>
        </div>
        <p className="text-xs text-[#79847E]">Fait avec 💚 en Côte d'Ivoire</p>
      </div>
    </div>
  </footer>
);

export default Footer;
