/**
 * Validation des redirections après connexion — Mon Jeton
 *
 * LE PROBLÈME
 * Login.tsx et Signup.tsx lisent le paramètre `returnTo` depuis l'URL,
 * puis l'utilisent pour deux choses :
 *   1. navigate(returnTo)
 *   2. redirect_uri: window.location.origin + returnTo   (OAuth Apple/Google)
 *
 * Ce paramètre vient de l'utilisateur, donc d'un attaquant potentiel.
 * Combiné à la faille connue de react-router (open redirect via
 * antislash, CVE-2025-68470), un lien du type :
 *
 *     https://monjeton.app/login?returnTo=\\site-pirate.ci
 *
 * connecte la victime puis la dépose sur un site pirate — qui n'a plus
 * qu'à imiter Mon Jeton pour réclamer un code ou un mot de passe.
 * Sur une application financière, c'est un vecteur d'hameçonnage sérieux.
 *
 * LA PARADE
 * N'accepter qu'un chemin interne : commence par un seul "/", et rien
 * qui puisse être réinterprété comme une adresse externe. Tout le reste
 * retombe silencieusement sur /dashboard.
 *
 * Cette validation protège aussi le redirect_uri OAuth, où une valeur
 * forgée pourrait détourner le jeton de session.
 */

const DEFAULT_ROUTE = "/dashboard";

export function safeReturnTo(
  raw: string | null | undefined,
  fallback: string = DEFAULT_ROUTE
): string {
  if (!raw) return fallback;

  let value = raw.trim();
  if (!value) return fallback;

  // Les navigateurs traitent l'antislash comme un slash dans une URL.
  // On normalise avant d'analyser, sinon "\\evil.ci" passerait au travers.
  value = value.replace(/\\/g, "/");

  // Doit être un chemin absolu interne.
  if (!value.startsWith("/")) return fallback;

  // "//evil.ci" et "///evil.ci" sont des URL protocol-relative : externes.
  if (value.startsWith("//")) return fallback;

  // Un schéma glissé après le slash ("/javascript:alert(1)") ou un
  // retour à la ligne utilisé pour casser l'analyse.
  if (/[\x00-\x1f]/.test(value)) return fallback;
  if (/^\/\s*[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;

  // Dernier filet : on demande au navigateur de résoudre le chemin
  // contre notre propre origine. S'il en sort, on refuse.
  try {
    const resolved = new URL(value, window.location.origin);
    if (resolved.origin !== window.location.origin) return fallback;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}

export default safeReturnTo;
