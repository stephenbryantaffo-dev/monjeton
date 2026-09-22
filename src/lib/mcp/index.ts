import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTransactions from "./tools/list-transactions";
import addTransaction from "./tools/add-transaction";
import financialSummary from "./tools/financial-summary";
import listWallets from "./tools/list-wallets";
import listBudgets from "./tools/list-budgets";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mon-jeton",
  title: "MON JETON",
  version: "0.1.0",
  instructions:
    "Outils de gestion financière personnelle Mon Jeton. Permet de lister et créer des transactions, consulter le résumé financier mensuel, les budgets, les portefeuilles et les catégories de l'utilisateur connecté. Les montants sont dans la devise du compte (FCFA par défaut).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTransactions, addTransaction, financialSummary, listBudgets, listWallets],
});
