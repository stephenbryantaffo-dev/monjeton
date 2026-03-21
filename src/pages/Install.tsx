import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, MoreVertical, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-foreground">Déjà installée !</h1>
          <p className="text-muted-foreground">Mon Jeton est déjà sur ton écran d'accueil.</p>
          <Button onClick={() => navigate("/dashboard")} variant="hero" size="lg">
            Ouvrir l'app
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-6 space-y-8">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="text-center space-y-3">
          <img src="/pwa-icon-192.png" alt="Mon Jeton" className="w-20 h-20 mx-auto rounded-2xl" loading="lazy" />
          <h1 className="text-2xl font-bold text-foreground">Installer Mon Jeton</h1>
          <p className="text-muted-foreground">Ajoute l'app sur ton écran d'accueil pour y accéder en un clic.</p>
        </div>

        {deferredPrompt && (
          <Button onClick={handleInstall} variant="hero" size="lg" className="w-full">
            <Download className="w-5 h-5 mr-2" />
            Installer l'application
          </Button>
        )}

        {isIOS && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Sur iPhone / iPad (Safari)</h2>
            <div className="space-y-3">
              {[
                { icon: <Share className="w-5 h-5 text-primary" />, text: "Appuie sur le bouton Partager en bas de l'écran" },
                { icon: <Plus className="w-5 h-5 text-primary" />, text: "Choisis \"Sur l'écran d'accueil\"" },
                { icon: <Download className="w-5 h-5 text-primary" />, text: "Confirme en appuyant sur \"Ajouter\"" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                    {step.icon}
                  </div>
                  <p className="text-sm text-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAndroid && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Sur Android (Chrome)</h2>
            <div className="space-y-3">
              {[
                { icon: <MoreVertical className="w-5 h-5 text-primary" />, text: "Appuie sur le menu ⋮ en haut à droite" },
                { icon: <Plus className="w-5 h-5 text-primary" />, text: "Choisis \"Ajouter à l'écran d'accueil\"" },
                { icon: <Download className="w-5 h-5 text-primary" />, text: "Confirme l'installation" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                    {step.icon}
                  </div>
                  <p className="text-sm text-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isIOS && !isAndroid && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Installation</h2>
            <p className="text-muted-foreground text-sm">
              Ouvre cette page depuis ton téléphone (Android avec Chrome ou iPhone avec Safari) pour voir les instructions d'installation.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-border space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Avantages</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✨ Accès rapide depuis l'écran d'accueil</li>
            <li>📱 Plein écran comme une vraie app</li>
            <li>⚡ Chargement ultra rapide</li>
            <li>🔒 Tes données restent sécurisées</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Install;
