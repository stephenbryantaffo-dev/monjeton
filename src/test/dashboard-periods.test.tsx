/**
 * Régression : en changeant de période (Jour / Semaine / Mois / Année), le
 * tableau de bord se vidait complètement lorsque la requête traînait, car
 * `loading` restait bloqué. Ce test vérifie que les cartes Revenus et
 * Dépenses restent affichées pour les quatre périodes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const TX = [
  { id: "1", type: "income", amount: 5000, date: "2026-09-02", note: "Salaire", created_at: "2026-09-02T10:00:00Z", categories: null },
  { id: "2", type: "expense", amount: 1500, date: "2026-09-03", note: "Taxi", created_at: "2026-09-03T10:00:00Z", categories: null },
];

// Chaîne de requête Supabase : chaque méthode renvoie le même objet, qui est
// aussi "thenable" pour être utilisable avec await.
function makeQuery(table: string) {
  const result: any = table === "transactions" ? { data: TX, error: null, count: TX.length } : { data: [], error: null, count: 0 };
  const q: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (res: any) => res(result);
        if (prop === "maybeSingle" || prop === "single") return async () => ({ data: null, error: null });
        return () => q;
      },
    }
  );
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeQuery(table),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, profile: { full_name: "Taffo" } }),
}));

vi.mock("@/contexts/PrivacyContext", () => ({
  usePrivacy: () => ({ formatAmount: (n: number) => `${n} F`, hidden: false }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/DashboardTontineWidget", () => ({ default: () => <div /> }));
vi.mock("@/components/DashboardCharts", () => ({ default: () => <div /> }));
vi.mock("@/components/SubscriptionRenewBanner", () => ({ default: () => null }));
vi.mock("@/components/PaidButNoProBanner", () => ({ default: () => null }));
vi.mock("@/components/DailyReminderModal", () => ({ default: () => null }));
vi.mock("@/components/MonthlyBadge", () => ({ default: () => null }));

import Dashboard from "@/pages/Dashboard";

describe("Dashboard — changement de période", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("affiche les cartes Revenus et Dépenses sur Jour, Semaine, Mois et Année", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    for (const period of ["Jour", "Semaine", "Mois", "Année"]) {
      fireEvent.click(screen.getByRole("button", { name: period }));
      await waitFor(() => {
        expect(screen.getByText("Revenus")).toBeInTheDocument();
        expect(screen.getByText("Dépenses")).toBeInTheDocument();
      });
    }
  });
});
