export interface PdfData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  categories: { name: string; value: number }[];
  monthlyData: { month: string; revenus: number; depenses: number }[];
  userName?: string;
  userEmail?: string;
}

const fmt = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

export const generateMonthlyPdf = (data: PdfData) => {
  const balance = data.totalIncome - data.totalExpense;
  const savingsRate = data.totalIncome > 0
    ? Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)
    : 0;
  const total = data.categories.reduce((s, c) => s + c.value, 0);

  const catRows = data.categories.map(cat => {
    const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
    const bars = Math.round(pct / 5);
    const bar = "\u2588".repeat(bars) + "\u2591".repeat(20 - bars);
    return `<tr>
      <td>${cat.name}</td>
      <td class="right-align"><b>${fmt(cat.value)} F</b></td>
      <td class="center">${pct}%</td>
      <td class="bar">${bar}</td>
    </tr>`;
  }).join("");

  const totalRow = `<tr class="total">
    <td>TOTAL</td>
    <td class="right-align">${fmt(total)} F</td>
    <td class="center">100%</td>
    <td></td>
  </tr>`;

  const evoRows = data.monthlyData.map((m, i) => {
    const bal = m.revenus - m.depenses;
    const prev = i > 0 ? data.monthlyData[i - 1].revenus - data.monthlyData[i - 1].depenses : bal;
    const trend = bal >= prev ? "\u2191" : "\u2193";
    const trendColor = bal >= prev ? "#27ae60" : "#e74c3c";
    return `<tr>
      <td><b>${m.month}</b></td>
      <td class="right-align green-text">${fmt(m.revenus)}</td>
      <td class="right-align red-text">${fmt(m.depenses)}</td>
      <td class="right-align"><b>${bal >= 0 ? "+" : ""}${fmt(bal)}</b></td>
      <td class="center" style="color:${trendColor};font-size:16px">${trend}</td>
    </tr>`;
  }).join("");

  const userInfo = [data.userName, data.userEmail].filter(Boolean).map(v => `<div>${v}</div>`).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Mon Jeton - Rapport ${data.month}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff}
  .header{background:#1a1a2e;color:#fff;padding:20px 24px 18px;border-bottom:3px solid #7ec845}
  .header h1{color:#7ec845;font-size:26px;font-weight:bold;margin-bottom:4px}
  .header .sub{color:#aaa;font-size:11px}
  .header .right{float:right;text-align:right;color:#ccc;font-size:11px;margin-top:-40px}
  .body{padding:20px 24px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
  .card{border-radius:6px;padding:12px 10px;text-align:center;border:1px solid #ddd}
  .card .label{font-size:9px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:6px}
  .card .value{font-size:14px;font-weight:bold}
  .card.green{background:#f0fff4;border-color:#7ec845}
  .card.green .value{color:#7ec845}
  .card.red{background:#fff5f5;border-color:#e74c3c}
  .card.red .value{color:#e74c3c}
  .card.gray{background:#f5f5f5;border-color:#ccc}
  .section-title{font-size:14px;font-weight:bold;color:#1a1a2e;margin-bottom:4px;padding-bottom:4px;border-bottom:2px solid #7ec845}
  .section{margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1a1a2e;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
  td{padding:7px 10px;border-bottom:1px solid #eee}
  tr:nth-child(even) td{background:#f9f9f9}
  tr.total td{background:#f0fff4;font-weight:bold;border-top:2px solid #7ec845}
  .bar{font-family:monospace;font-size:10px;color:#7ec845}
  .green-text{color:#27ae60;font-weight:bold}
  .red-text{color:#e74c3c;font-weight:bold}
  .right-align{text-align:right}
  .center{text-align:center}
  .footer{margin-top:30px;padding:10px 24px;border-top:2px solid #7ec845;display:flex;justify-content:space-between;font-size:10px;color:#888}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header,.footer,th,tr.total td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="header">
  <h1>MON JETON</h1>
  <div class="sub">Votre coach financier intelligent</div>
  <div class="right">
    <div><b>Rapport \u2014 ${data.month}</b></div>
    ${userInfo}
    <div>G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString("fr-FR")}</div>
  </div>
</div>
<div class="body">
  <div class="cards">
    <div class="card green">
      <div class="label">Revenus</div>
      <div class="value">${fmt(data.totalIncome)} F</div>
    </div>
    <div class="card red">
      <div class="label">D\u00e9penses</div>
      <div class="value">${fmt(data.totalExpense)} F</div>
    </div>
    <div class="card gray">
      <div class="label">Solde net</div>
      <div class="value" style="color:${balance >= 0 ? "#7ec845" : "#e74c3c"}">${balance >= 0 ? "+" : ""}${fmt(balance)} F</div>
    </div>
    <div class="card green">
      <div class="label">Taux \u00e9pargne</div>
      <div class="value">${savingsRate}%</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">\ud83d\udcca D\u00e9penses par cat\u00e9gorie</div>
    <table>
      <thead><tr>
        <th>Cat\u00e9gorie</th><th>Montant (FCFA)</th><th>% Budget</th><th>R\u00e9partition</th>
      </tr></thead>
      <tbody>${catRows}${totalRow}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">\ud83d\udcc8 \u00c9volution mensuelle</div>
    <table>
      <thead><tr>
        <th>Mois</th><th>Revenus (F)</th><th>D\u00e9penses (F)</th><th>Solde (F)</th><th>Tend.</th>
      </tr></thead>
      <tbody>${evoRows}</tbody>
    </table>
  </div>
</div>
<div class="footer">
  <span>\ud83e\ude99 Mon Jeton \u2014 Rapport financier confidentiel</span>
  <span>G\u00e9n\u00e9r\u00e9 automatiquement</span>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 500);
    };
  }
};
