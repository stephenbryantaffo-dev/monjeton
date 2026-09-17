import ArchiveLanding from "@/components/landing/archive/ArchiveLanding";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import "./landing-archive/styles.css";
import "./landing-archive/hybrid.css";
import "./landing-archive/atmosphere.css";

const Landing = () => {
  useDocumentMeta({
    title: "Mon Jeton — Dépenses, revenus et épargne en FCFA",
    description: "Dépenses, budgets, tontines et objectifs : suivez votre argent en FCFA avec Mon Jeton. À la voix, avec un reçu ou en quelques gestes.",
    path: "/",
  });
  return <ArchiveLanding />;
};

export default Landing;
