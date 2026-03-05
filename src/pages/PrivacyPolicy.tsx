import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h1 className="text-3xl font-bold mb-6">Politique de Confidentialité</h1>
      <p className="text-sm text-muted-foreground mb-6">Dernière mise à jour : 5 mars 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-secondary-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
          <p>Mon Jeton ("nous", "notre") est une application de gestion financière personnelle développée par Djaitech, basée en Côte d'Ivoire. Cette politique explique comment nous collectons, utilisons et protégeons vos données personnelles conformément aux lois applicables en matière de protection des données.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Informations de compte</strong> : nom, adresse e-mail, mot de passe (chiffré).</li>
            <li><strong>Données financières</strong> : transactions, portefeuilles, budgets, objectifs d'épargne, dettes — saisies volontairement par vous.</li>
            <li><strong>Données d'utilisation</strong> : interactions avec l'application (à des fins d'amélioration du service).</li>
            <li><strong>Images</strong> : photos de reçus que vous scannez (traitées puis supprimables).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Utilisation des données</h2>
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Fournir les fonctionnalités de suivi financier de l'application.</li>
            <li>Générer des rapports et analyses personnalisés.</li>
            <li>Améliorer la qualité du service et corriger les bugs.</li>
            <li>Assurer la sécurité de votre compte.</li>
          </ul>
          <p className="mt-2">Nous ne vendons <strong>jamais</strong> vos données à des tiers.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Stockage et sécurité</h2>
          <p>Vos données sont stockées de manière sécurisée sur des serveurs chiffrés. Les mots de passe sont hashés. Les communications sont protégées par HTTPS/TLS. L'accès aux données est restreint par des politiques de sécurité au niveau de la base de données (RLS).</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Vos droits</h2>
          <p>Vous avez le droit de :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Accéder</strong> à toutes vos données personnelles.</li>
            <li><strong>Rectifier</strong> vos informations de profil.</li>
            <li><strong>Supprimer</strong> votre compte et toutes les données associées via l'option "Supprimer mon compte" dans les paramètres.</li>
            <li><strong>Exporter</strong> vos données (fonctionnalité PDF disponible).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Cookies et suivi</h2>
          <p>Mon Jeton n'utilise pas de cookies tiers ni de traceurs publicitaires. Seul un stockage local minimal (préférences utilisateur, session) est utilisé pour le fonctionnement de l'application.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Partage de données</h2>
          <p>Vos données ne sont partagées avec aucun tiers, sauf :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Les services d'infrastructure nécessaires au fonctionnement (hébergement sécurisé).</li>
            <li>Sur demande légale d'une autorité compétente.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Modifications</h2>
          <p>Nous nous réservons le droit de modifier cette politique. Toute modification sera communiquée via l'application. La date de dernière mise à jour sera actualisée en haut de cette page.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact</h2>
          <p>Pour toute question relative à vos données personnelles, contactez-nous à : <a href="mailto:contact@track-emoney.com" className="text-primary hover:underline">contact@track-emoney.com</a></p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
