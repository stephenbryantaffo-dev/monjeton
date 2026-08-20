import { CaisseData, CaisseMember, CaisseCotisation, CaisseDepense, CaisseRecette, CaisseMemberHistory, DEPENSE_CAT_LABELS, RECETTE_SOURCE_LABELS } from "./types";

const fmt = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

// Échappement HTML pour éviter XSS via données utilisateur dans les exports PDF
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getActionLabel = (action: string) =>
  ({
    added: "Membre ajouté",
    removed: "Membre retiré",
    reinstated: "Membre réintégré",
    cotisation_cancelled: "↩️ Cotisation annulée",
    suspended: "⏸️ Membre suspendu",
  }[action] || action);

const statusLabel = (s: string) =>
  ({ active: "Actif", removed: "Retiré", suspended: "Suspendu" }[s] || s);

const statusColor = (s: string) =>
  ({ active: "#5FD41F", removed: "#e74c3c", suspended: "#f39c12" }[s] || "#888");

export interface CaissePdfData {
  caisse: CaisseData;
  members: CaisseMember[];
  cotisations: CaisseCotisation[];
  cancelledCotisations: CaisseCotisation[];
  depenses: CaisseDepense[];
  recettes?: CaisseRecette[];
  memberHistory: CaisseMemberHistory[];
  soldeDisponible: number;
}

export const generateCaissePdf = (data: CaissePdfData) => {
  const { caisse, members, cotisations, cancelledCotisations, depenses, memberHistory, soldeDisponible } = data;
  const recettes = data.recettes || [];
  const totalRecettes = Number((caisse as any).total_recettes ?? 0);
  const resultatEvenement = totalRecettes - Number(caisse.total_spent);

  const activeMembers = members.filter(m => m.status === "active");
  const inactiveMembers = members.filter(m => m.status !== "active");

  // Member rows
  const memberRows = members
    .map((m) => {
      const total = cotisations
        .filter(c => c.member_id === m.id)
        .reduce((s, c) => s + Number(c.amount), 0);
      return `<tr>
        <td>${esc(m.name)}</td>
        <td class="ca"><span style="color:${statusColor(m.status)};font-weight:bold;font-size:11px">${esc(statusLabel(m.status))}</span></td>
        <td class="ra bold">${fmt(total)}</td>
        <td class="ca">${esc(m.phone || "—")}</td>
      </tr>`;
    })
    .join("");

  // Cotisation rows (confirmed)
  const cotisationRows = cotisations
    .slice(0, 50)
    .map((c) => {
      const memberName = members.find(m => m.id === c.member_id)?.name || "?";
      return `<tr>
        <td>${new Date(c.cotisation_date).toLocaleDateString("fr-FR")}</td>
        <td>${esc(memberName)}</td>
        <td class="ra green bold">+${fmt(c.amount)}</td>
        <td>${esc(c.cycle_label || "—")}</td>
      </tr>`;
    })
    .join("");

  // Cancelled cotisation rows
  const cancelledRows = cancelledCotisations
    .slice(0, 20)
    .map((c) => {
      const memberName = members.find(m => m.id === c.member_id)?.name || "?";
      return `<tr>
        <td>${c.cancelled_at ? new Date(c.cancelled_at).toLocaleDateString("fr-FR") : "—"}</td>
        <td>${esc(memberName)}</td>
        <td class="ra" style="color:#f39c12;text-decoration:line-through">${fmt(c.amount)}</td>
        <td>${esc(c.cancel_reason || "—")}</td>
      </tr>`;
    })
    .join("");

  // Depense rows
  const depenseRows = depenses
    .slice(0, 50)
    .map((d) => {
      const catLabel = DEPENSE_CAT_LABELS[d.category || "autre"] || d.category || "—";
      return `<tr>
        <td>${new Date(d.depense_date).toLocaleDateString("fr-FR")}</td>
        <td>${esc(d.label)}</td>
        <td class="ra red bold">-${fmt(d.amount)}</td>
        <td>${esc(catLabel)}</td>
        <td>${esc(d.beneficiaire || "—")}</td>
      </tr>`;
    })
    .join("");

  // Recette rows
  const recetteRows = recettes
    .slice(0, 50)
    .map((r) => {
      const srcLabel = RECETTE_SOURCE_LABELS[r.source] || r.source || "—";
      const detail = r.quantite && r.prix_unitaire ? `${r.quantite} × ${fmt(Number(r.prix_unitaire))}` : "—";
      const fillRate = r.quantite && r.quantite_prevue && Number(r.quantite_prevue) > 0
        ? `${Math.round((Number(r.quantite) / Number(r.quantite_prevue)) * 100)}%`
        : "—";
      return `<tr>
        <td>${new Date(r.recette_date).toLocaleDateString("fr-FR")}</td>
        <td>${esc(r.label)}</td>
        <td class="ra green bold">+${fmt(r.amount)}</td>
        <td>${esc(srcLabel)}</td>
        <td>${esc(detail)}</td>
        <td>${esc(r.quantite_prevue != null ? String(r.quantite_prevue) : "—")}</td>
        <td>${esc(fillRate)}</td>
        <td>${esc(r.contact || "—")}</td>
      </tr>`;
    })
    .join("");

  // History rows
  const historyRows = memberHistory
    .slice(0, 30)
    .map((h) => {
      const memberName = members.find(m => m.id === h.member_id)?.name || "?";
      return `<tr>
        <td>${new Date(h.created_at).toLocaleDateString("fr-FR")}</td>
        <td>${esc(getActionLabel(h.action))}</td>
        <td>${esc(memberName)}</td>
        <td>${esc(h.reason || "—")}</td>
      </tr>`;
    })
    .join("");

  // Depense by category summary
  const catSummary: Record<string, number> = {};
  depenses.forEach(d => {
    const cat = DEPENSE_CAT_LABELS[d.category || "autre"] || d.category || "Autre";
    catSummary[cat] = (catSummary[cat] || 0) + Number(d.amount);
  });
  const catSummaryRows = Object.entries(catSummary)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => {
      const pct = caisse.total_spent > 0 ? Math.round((amount / caisse.total_spent) * 100) : 0;
      return `<tr><td>${esc(cat)}</td><td class="ra bold">${fmt(amount)}</td><td class="ca">${pct}%</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Caisse ${caisse.name} — Rapport</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff}
.hdr{background:#14171C;padding:18px 24px;border-bottom:3px solid #7CFF3A}
.hdr h1{color:#7CFF3A;font-size:22px;font-weight:bold}
.hdr .sub{color:#aaa;font-size:11px;margin-top:3px}
.hdr .date{float:right;color:#ccc;font-size:11px;text-align:right;margin-top:-36px}
.body{padding:20px 24px}
.print-hint{background:#e8f5e9;padding:8px 14px;border-radius:6px;font-size:11px;color:#388e3c;margin-bottom:16px;text-align:center}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
.card{border-radius:8px;padding:14px 10px;text-align:center}
.card .lbl{font-size:9px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:5px}
.card .val{font-size:15px;font-weight:bold}
.card .sub-val{font-size:9px;color:#999;margin-top:3px}
.cg{background:#f0fff4;border:1px solid #7CFF3A}
.cr{background:#fff5f5;border:1px solid #e74c3c}
.cgy{background:#f5f5f5;border:1px solid #ccc}
.cb{background:#f0f8ff;border:1px solid #3498db}
.sec{margin-bottom:22px}
.sec-title{font-size:13px;font-weight:bold;color:#14171C;padding-bottom:5px;border-bottom:2px solid #7CFF3A;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#14171C;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
td{padding:6px 10px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f9f9f9}
.total td{background:#f0fff4;font-weight:bold;border-top:2px solid #7CFF3A}
.ra{text-align:right}
.ca{text-align:center}
.bold{font-weight:bold}
.green{color:#5FD41F}
.red{color:#e74c3c}
.footer{margin-top:20px;padding-top:8px;border-top:2px solid #7CFF3A;display:flex;justify-content:space-between;font-size:10px;color:#888}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hdr,th,.total td,.cg,.cr,.cb{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .print-hint{display:none}
}
</style>
</head>
<body>
<div class="hdr">
  <div class="date">
    <div>Rapport généré le ${new Date().toLocaleDateString("fr-FR")}</div>
    <div>${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
  </div>
  <h1>${esc(caisse.name)}</h1>
  <div class="sub">${esc(caisse.description || "Caisse commune")} · ${caisse.frequency === "monthly" ? "Mensuelle" : caisse.frequency === "weekly" ? "Hebdomadaire" : esc(caisse.frequency)}</div>
</div>
<div class="body">

  <div class="print-hint">Pour sauvegarder en PDF : Ctrl+P → choisir "Enregistrer en PDF"</div>

  <div class="cards">
    <div class="card cg">
      <div class="lbl">Total collecté</div>
      <div class="val green">${fmt(caisse.total_collected)}</div>
      <div class="sub-val">${cotisations.length} cotisation${cotisations.length > 1 ? "s" : ""}</div>
    </div>
    <div class="card cr">
      <div class="lbl">Total dépensé</div>
      <div class="val red">${fmt(caisse.total_spent)}</div>
      <div class="sub-val">${depenses.length} dépense${depenses.length > 1 ? "s" : ""}</div>
    </div>
    <div class="card" style="background:#f0fff4;border:2px solid #7CFF3A">
      <div class="lbl">Solde disponible</div>
      <div class="val" style="color:${soldeDisponible >= 0 ? "#5FD41F" : "#e74c3c"}">${fmt(soldeDisponible)}</div>
      <div class="sub-val">${soldeDisponible >= 0 ? "En caisse" : "Déficit"}</div>
    </div>
    <div class="card cb">
      <div class="lbl">Membres</div>
      <div class="val" style="color:#3498db">${activeMembers.length}</div>
      <div class="sub-val">${inactiveMembers.length > 0 ? `+ ${inactiveMembers.length} inactif${inactiveMembers.length > 1 ? "s" : ""}` : "Tous actifs"}</div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Liste des membres (${members.length})</div>
    <table>
      <thead><tr><th>Nom</th><th>Statut</th><th>Total versé</th><th>Téléphone</th></tr></thead>
      <tbody>
        ${memberRows}
        <tr class="total">
          <td>TOTAL</td><td></td>
          <td class="ra">${fmt(cotisations.reduce((s, c) => s + Number(c.amount), 0))} F</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="sec">
    <div class="sec-title">Cotisations confirmées (${cotisations.length})</div>
    ${cotisations.length > 0 ? `<table>
      <thead><tr><th>Date</th><th>Membre</th><th>Montant</th><th>Cycle</th></tr></thead>
      <tbody>${cotisationRows}</tbody>
    </table>` : `<p style="color:#888;font-size:12px;padding:10px 0">Aucune cotisation enregistrée</p>`}
  </div>

  ${cancelledCotisations.length > 0 ? `<div class="sec">
    <div class="sec-title" style="border-bottom-color:#f39c12">↩️ Cotisations annulées (${cancelledCotisations.length})</div>
    <table>
      <thead><tr><th>Date annul.</th><th>Membre</th><th>Montant</th><th>Raison</th></tr></thead>
      <tbody>${cancelledRows}</tbody>
    </table>
  </div>` : ""}

  <div class="sec">
    <div class="sec-title" style="border-bottom-color:#e74c3c">Dépenses (${depenses.length})</div>
    ${depenses.length > 0 ? `<table>
      <thead><tr><th>Date</th><th>Description</th><th>Montant</th><th>Catégorie</th><th>Bénéficiaire</th></tr></thead>
      <tbody>${depenseRows}</tbody>
    </table>` : `<p style="color:#888;font-size:12px;padding:10px 0">Aucune dépense enregistrée</p>`}
  </div>

  <div class="sec">
    <div class="sec-title">Recettes (${recettes.length})</div>
    ${recettes.length > 0 ? `<table>
      <thead><tr><th>Date</th><th>Libellé</th><th>Montant</th><th>Source</th><th>Détail</th><th>Contact</th></tr></thead>
      <tbody>${recetteRows}
        <tr class="total"><td colspan="2">TOTAL RECETTES</td><td class="ra">${fmt(totalRecettes)}</td><td colspan="3"></td></tr>
      </tbody>
    </table>` : `<p style="color:#888;font-size:12px;padding:10px 0">Aucune recette enregistrée</p>`}
  </div>

  <div class="sec">
    <div class="sec-title">Bilan de l'événement</div>
    <table>
      <tbody>
        <tr><td>Recettes extérieures</td><td class="ra green bold">${fmt(totalRecettes)}</td></tr>
        <tr><td>Dépenses</td><td class="ra red bold">-${fmt(caisse.total_spent)}</td></tr>
        <tr class="total"><td>RÉSULTAT</td><td class="ra" style="color:${resultatEvenement >= 0 ? "#5FD41F" : "#e74c3c"}">${resultatEvenement > 0 ? "+" : ""}${fmt(resultatEvenement)}</td></tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:#666;margin-top:6px">${resultatEvenement > 0 ? "L&#039;événement est rentable." : resultatEvenement < 0 ? `L&#039;événement est déficitaire de ${fmt(Math.abs(resultatEvenement))} FCFA.` : "L&#039;événement est à l&#039;équilibre."}</p>
  </div>

  ${Object.keys(catSummary).length > 0 ? `<div class="sec">
    <div class="sec-title">Répartition des dépenses</div>
    <table>
      <thead><tr><th>Catégorie</th><th>Montant</th><th>Part</th></tr></thead>
      <tbody>
        ${catSummaryRows}
        <tr class="total"><td>TOTAL</td><td class="ra">${fmt(caisse.total_spent)}</td><td class="ca">100%</td></tr>
      </tbody>
    </table>
  </div>` : ""}

  ${memberHistory.length > 0 ? `<div class="sec">
    <div class="sec-title">Historique des actions sur les membres</div>
    <table>
      <thead><tr><th>Date</th><th>Action</th><th>Membre</th><th>Raison</th></tr></thead>
      <tbody>${historyRows}</tbody>
    </table>
  </div>` : ""}

</div>
<div class="footer">
  <span>Mon Jeton — Caisse "${esc(caisse.name)}"</span>
  <span>Généré automatiquement • Confidentiel</span>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 800);
    });
  }
};
