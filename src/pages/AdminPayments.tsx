import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type Row = {
  txn_id: string;
  created_at: string;
  amount: number;
  method: string;
  email: string | null;
  phone: string | null;
  reference: string | null;
  status: string;
  plan_name: string | null;
  activated: boolean;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const fmtAmount = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

const AdminPayments = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<Row | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jekoRes, payRes] = await Promise.all([
        supabase.from("jeko_payments").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (jekoRes.error) throw jekoRes.error;
      if (payRes.error) throw payRes.error;

      const map = new Map<string, Row>();

      for (const p of payRes.data || []) {
        map.set(p.txn_id, {
          txn_id: p.txn_id,
          created_at: p.created_at,
          amount: Number(p.amount) >= 100000 ? Number(p.amount) / 100 : Number(p.amount),
          method: "—",
          email: p.payer_email,
          phone: p.payer_phone,
          reference: null,
          status: p.status,
          plan_name: p.plan_name,
          activated: !!p.user_id && p.status === "claimed",
        });
      }

      for (const j of jekoRes.data || []) {
        const raw = (j.raw_payload || {}) as any;
        const prev = map.get(j.txn_id);
        map.set(j.txn_id, {
          txn_id: j.txn_id!,
          created_at: j.created_at,
          amount: Number(j.amount ?? prev?.amount ?? 0),
          method: raw?.paymentMethod || prev?.method || "—",
          email: prev?.email ?? null,
          phone: j.phone ?? prev?.phone ?? null,
          reference: j.reference ?? null,
          status: String(raw?.status ?? prev?.status ?? "—"),
          plan_name: j.plan_name ?? prev?.plan_name ?? null,
          activated: !!j.activated || !!prev?.activated,
        });
      }

      setRows([...map.values()].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async () => {
    if (!target) return;
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      toast.error("Adresse e-mail invalide");
      return;
    }
    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc("admin_activate_payment", {
      _txn_id: target.txn_id,
      _email: value,
    });
    setSaving(false);
    if (rpcError) {
      toast.error(rpcError.message);
      return;
    }
    const res = data as any;
    if (!res?.success) {
      toast.error(res?.error === "no_account" ? "Aucun compte avec cet e-mail" : "Activation impossible");
      return;
    }
    toast.success(`Plan ${res.plan} activé pour ${value}`);
    setTarget(null);
    setEmail("");
    load();
  };

  return (
    <DashboardLayout title="Paiements reçus" hideBell>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{rows.length} paiement(s)</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {error && (
        <div className="glass-card rounded-2xl p-4 text-center text-destructive text-sm mb-4">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Aucun paiement enregistré pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <motion.div
              key={r.txn_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-foreground">{fmtAmount(r.amount)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${
                    r.activated ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {r.activated ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {r.activated ? "Pro activé" : "Non activé"}
                </span>
              </div>

              <dl className="mt-3 space-y-1 text-xs">
                {[
                  ["Moyen", r.method],
                  ["Statut", r.status],
                  ["Plan", r.plan_name || "—"],
                  ["E-mail", r.email || "—"],
                  ["Téléphone", r.phone || "—"],
                  ["Référence", r.reference || "—"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="flex-1 min-w-0 truncate text-foreground">{v as string}</dd>
                  </div>
                ))}
              </dl>

              {!r.activated && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    setTarget(r);
                    setEmail(r.email || "");
                  }}
                >
                  Activer manuellement
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activer manuellement</DialogTitle>
            <DialogDescription>
              Rattache ce paiement à un compte via son adresse e-mail et active le plan pour 30 jours.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            inputMode="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={activate} disabled={saving}>
              {saving ? "Activation…" : "Activer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminPayments;
