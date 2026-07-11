import { Separator } from "@/components/ui/separator";
import logoImg from "@/assets/logo-monjeton.webp";
import { useLandingT } from "@/hooks/useLandingT";

const Footer = () => {
  const { lt } = useLandingT();
  return (
    <footer id="footer" className="py-12 px-5 border-t border-[rgba(255,255,255,0.08)]">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoImg} alt="Mon Jeton" className="h-8 w-auto rounded-md" loading="lazy" />
              <span className="font-bold text-[#D5D7D6]">Mon Jeton</span>
            </div>
            <p className="text-sm text-[#79847E] italic">{lt.footer_slogan}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#D5D7D6] mb-3">{lt.footer_links}</h4>
            <ul className="space-y-2 text-sm text-[#79847E]">
              <li><a href="#demo" className="hover:text-[#8DD621] transition-colors">{lt.footer_features}</a></li>
              <li><a href="#pricing" className="hover:text-[#8DD621] transition-colors">{lt.footer_pricing}</a></li>
              <li><a href="#faq" className="hover:text-[#8DD621] transition-colors">{lt.footer_faq}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#D5D7D6] mb-3">{lt.footer_contact}</h4>
            <ul className="space-y-2 text-sm text-[#79847E]">
              <li>brentgroup1@gmail.com</li>
              <li>+225 07 78 36 19 88</li>
              <li>🌍 Côte d'Ivoire</li>
            </ul>
          </div>
        </div>
        <Separator className="bg-[rgba(255,255,255,0.06)]" />
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#79847E]">{lt.footer_rights}</p>
          <div className="flex gap-4">
            <a href="/privacy" className="text-xs text-[#79847E] hover:text-[#8DD621] transition-colors">{lt.footer_privacy}</a>
            <a href="/terms" className="text-xs text-[#79847E] hover:text-[#8DD621] transition-colors">{lt.footer_terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
