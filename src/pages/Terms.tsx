import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground px-5 py-8 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h1 className="text-3xl font-bold mb-6">Conditions Générales d'Utilisation</h1>
      <p className="text-sm text-muted-foreground mb-6">Dernière mise à jour : 5 mars 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-secondary-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Objet</h2>
          <p>Les présentes Conditions Générales d'Utilisation (CGU) définissent les règles d'utilisation de l'application mobile Mon Jeton, éditée par Djaitech, SARL de droit ivoirien.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Acceptation</h2>
          <p>En créant un compte ou en utilisant Mon Jeton, vous acceptez les présentes CGU dans leur intégralité. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Description du service</h2>
          <p>Mon Jeton est une application de gestion financière personnelle permettant de :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Suivre ses revenus et dépenses en Franc CFA (XOF).</li>
            <li>Gérer plusieurs portefeuilles (mobile money, cash, etc.).</li>
            <li>Scanner des reçus et extraire des données automatiquement.</li>
            <li>Définir des budgets et objectifs d'épargne.</li>
            <li>Utiliser un assistant IA pour l'analyse financière.</li>
            <li>Convertir des devises automatiquement.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Inscription</h2>
          <p>L'utilisation de Mon Jeton nécessite la création d'un compte avec une adresse e-mail valide. Vous êtes responsable de la confidentialité de vos identifiants de connexion.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Responsabilité</h2>
          <p>Mon Jeton est un outil d'aide à la gestion financière. Il ne constitue en aucun cas un conseil financier, fiscal ou juridique. Les données saisies le sont sous votre entière responsabilité. Nous ne saurions être tenus responsables de décisions financières prises sur la base des informations affichées dans l'application.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Propriété intellectuelle</h2>
          <p>L'ensemble des éléments de l'application (design, code, contenu, marque) sont la propriété exclusive de Djaitech. Toute reproduction, même partielle, est interdite sans autorisation.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Données personnelles</h2>
          <p>Le traitement de vos données personnelles est régi par notre <a href="/privacy" className="text-primary hover:underline">Politique de Confidentialité</a>.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Résiliation</h2>
          <p>Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application. La suppression entraîne l'effacement définitif et irréversible de toutes vos données.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Modifications des CGU</h2>
          <p>Nous nous réservons le droit de modifier les présentes CGU. Les utilisateurs seront notifiés de tout changement significatif. L'utilisation continue de l'application après modification vaut acceptation.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Droit applicable</h2>
          <p>Les présentes CGU sont régies par le droit ivoirien. Tout litige sera soumis aux juridictions compétentes d'Abidjan, Côte d'Ivoire.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
          <p>Pour toute question : <a href="mailto:contact@track-emoney.com" className="text-primary hover:underline">contact@track-emoney.com</a></p>
        </div>
      </section>
    </div>
  );
};

export default Terms;
