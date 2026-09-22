import { Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  useEffect(() => {
    console.warn("404 : page inexistante visitée");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg">
      <div className="text-center px-4">
        <h1 className="mb-4 text-5xl font-black text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="text-primary underline hover:text-primary/90 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
