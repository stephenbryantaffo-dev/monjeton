import { Separator } from "@/components/ui/separator";
import logoImg from "@/assets/logo-monjeton.png";

const Footer = () => (
  <footer className="py-12 px-5 border-t border-border/30">
    <div className="max-w-6xl mx-auto">
      <div className="grid sm:grid-cols-3 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoImg} alt="Mon Jeton" className="h-8 w-auto rounded-md" />
            <span className="font-bold text-foreground">Mon Jeton</span>
          </div>
          <p className="text-sm text-muted-foreground italic">"Tu vas voir clair dans ton jeton."</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Liens</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-primary transition-colors">Fonctionnalités</a></li>
            <li><a href="#pricing" className="hover:text-primary transition-colors">Tarifs</a></li>
            <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>contact@track-emoney.com</li>
            <li>+225 00 00 00 00</li>
            <li>🌍 Côte d'Ivoire</li>
          </ul>
        </div>
      </div>
      <Separator className="bg-border/30" />
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">© 2026 Djaitech. Tous droits réservés.</p>
        <p className="text-xs text-muted-foreground">Fait avec 💚 en Côte d'Ivoire</p>
      </div>
    </div>
  </footer>
);

export default Footer;
