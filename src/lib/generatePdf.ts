export interface PdfData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  categories: { name: string; value: number }[];
  monthlyData: { month: string; revenus: number; depenses: number }[];
}

const fmt = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

export const generateMonthlyPdf = (data: PdfData) => {
  const balance = data.totalIncome - data.totalExpense;
  const savingsRate =
    data.totalIncome > 0
      ? Math.round(
          ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
        )
      : 0;
  const total = data.categories.reduce((s, c) => s + c.value, 0);

  const catRows = data.categories
    .map((cat) => {
      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
      const bars = Math.round(pct / 5);
      const bar = "\u2588".repeat(bars) + "\u2591".repeat(20 - bars);
      return `<tr>
          <td>${cat.name}</td>
          <td class="ra bold">${fmt(cat.value)} F</td>
          <td class="ca">${pct}%</td>
          <td class="bar">${bar}</td>
        </tr>`;
    })
    .join("");

  const evRows = data.monthlyData
    .map((m, i) => {
      const bal = m.revenus - m.depenses;
      const prev =
        i > 0
          ? data.monthlyData[i - 1].revenus - data.monthlyData[i - 1].depenses
          : bal;
      const up = bal >= prev;
      return `<tr>
          <td class="bold">${m.month}</td>
          <td class="ra green">${fmt(m.revenus)}</td>
          <td class="ra red">${fmt(m.depenses)}</td>
          <td class="ra bold ${bal >= 0 ? "green" : "red"}">${bal >= 0 ? "+" : ""}${fmt(bal)}</td>
          <td class="ca trend ${up ? "green" : "red"}">${up ? "\u2191" : "\u2193"}</td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Mon Jeton - ${data.month}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff}
.hdr{background:#1a1a2e;padding:18px 24px;border-bottom:3px solid #7ec845}
.hdr h1{color:#7ec845;font-size:24px;font-weight:bold}
.hdr .meta{color:#aaa;font-size:11px;margin-top:3px}
.hdr .date{float:right;color:#ccc;font-size:11px;text-align:right;margin-top:-36px}
.body{padding:20px 24px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
.card{border-radius:6px;padding:12px;text-align:center}
.card .lbl{font-size:9px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:5px}
.card .val{font-size:13px;font-weight:bold}
.cg{background:#f0fff4;border:1px solid #7ec845}
.cr{background:#fff5f5;border:1px solid #e74c3c}
.cgy{background:#f5f5f5;border:1px solid #ccc}
.sec{margin-bottom:22px}
.sec-title{font-size:13px;font-weight:bold;color:#1a1a2e;padding-bottom:5px;border-bottom:2px solid #7ec845;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#1a1a2e;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
td{padding:6px 10px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f9f9f9}
.total td{background:#f0fff4;font-weight:bold;border-top:2px solid #7ec845}
.ra{text-align:right}
.ca{text-align:center}
.bold{font-weight:bold}
.green{color:#27ae60}
.red{color:#e74c3c}
.bar{font-family:monospace;font-size:9px;color:#7ec845}
.trend{font-size:16px;font-weight:bold}
.footer{margin-top:20px;padding-top:8px;border-top:2px solid #7ec845;display:flex;justify-content:space-between;font-size:10px;color:#888}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hdr,th,.total td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="hdr">
  <div class="date">
    <div>Rapport \u2014 ${data.month}</div>
    <div>G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString("fr-FR")}</div>
  </div>
  <h1>MON JETON</h1>
  <div class="meta">Votre coach financier intelligent</div>
</div>
<div class="body">
  <div class="cards">
    <div class="card cg">
      <div class="lbl">Revenus</div>
      <div class="val green">${fmt(data.totalIncome)} F</div>
    </div>
    <div class="card cr">
      <div class="lbl">D\u00e9penses</div>
      <div class="val red">${fmt(data.totalExpense)} F</div>
    </div>
    <div class="card cgy">
      <div class="lbl">Solde net</div>
      <div class="val" style="color:${balance >= 0 ? "#7ec845" : "#e74c3c"}">${balance >= 0 ? "+" : ""}${fmt(balance)} F</div>
    </div>
    <div class="card cg">
      <div class="lbl">Taux \u00e9pargne</div>
      <div class="val green">${savingsRate}%</div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">D\u00e9penses par cat\u00e9gorie</div>
    <table>
      <thead><tr>
        <th>Cat\u00e9gorie</th><th>Montant (FCFA)</th><th>% Budget</th><th>R\u00e9partition</th>
      </tr></thead>
      <tbody>
        ${catRows}
        <tr class="total">
          <td>TOTAL</td>
          <td class="ra">${fmt(total)} F</td>
          <td class="ca">100%</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="sec">
    <div class="sec-title">\u00c9volution mensuelle</div>
    <table>
      <thead><tr>
        <th>Mois</th><th>Revenus (F)</th><th>D\u00e9penses (F)</th><th>Solde (F)</th><th>Tend.</th>
      </tr></thead>
      <tbody>${evRows}</tbody>
    </table>
  </div>
</div>
<div class="footer">
  <span>Mon Jeton \u2014 Rapport financier confidentiel</span>
  <span>G\u00e9n\u00e9r\u00e9 automatiquement</span>
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
