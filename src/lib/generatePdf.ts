import jsPDF from "jspdf";

interface PdfData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  categories: { name: string; value: number }[];
  monthlyData: { month: string; revenus: number; depenses: number }[];
}

export const generateMonthlyPdf = (data: PdfData) => {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 15);
  doc.rect(0, 0, w, 40, "F");
  doc.setTextColor(180, 230, 80);
  doc.setFontSize(20);
  doc.text("Mon Jeton", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text(`Rapport — ${data.month}`, 14, 30);

  // Summary
  let y = 55;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.text("Résumé", 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Revenus : ${data.totalIncome.toLocaleString("fr-FR")} FCFA`, 14, y);
  y += 7;
  doc.text(`Dépenses : ${data.totalExpense.toLocaleString("fr-FR")} FCFA`, 14, y);
  y += 7;
  const balance = data.totalIncome - data.totalExpense;
  doc.text(`Solde : ${balance.toLocaleString("fr-FR")} FCFA`, 14, y);
  y += 15;

  // Categories breakdown
  if (data.categories.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("Dépenses par catégorie", 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    data.categories.forEach((cat) => {
      const pct = data.totalExpense > 0 ? Math.round((cat.value / data.totalExpense) * 100) : 0;
      doc.text(`${cat.name} : ${cat.value.toLocaleString("fr-FR")} FCFA (${pct}%)`, 20, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 10;
  }

  // Monthly evolution
  if (data.monthlyData.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("Évolution mensuelle", 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    data.monthlyData.forEach((m) => {
      doc.text(`${m.month} — Revenus: ${m.revenus.toLocaleString("fr-FR")} | Dépenses: ${m.depenses.toLocaleString("fr-FR")}`, 20, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Mon Jeton — Page ${i}/${pages}`, w / 2, 290, { align: "center" });
  }

  doc.save(`track-emoney-rapport-${data.month.replace(/\s/g, "-")}.pdf`);
};
