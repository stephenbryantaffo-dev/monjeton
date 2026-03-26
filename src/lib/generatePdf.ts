import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const GREEN = [126, 200, 69] as [number, number, number];
  const DARK = [26, 26, 46] as [number, number, number];
  const GRAY = [136, 136, 136] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const LIGHT_GREEN = [240, 255, 244] as [number, number, number];
  const RED = [231, 76, 60] as [number, number, number];
  const LIGHT_GRAY = [245, 245, 245] as [number, number, number];

  // ── HEADER ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, 38, "F");
  doc.setFillColor(...GREEN);
  doc.rect(0, 38, w, 2, "F");

  doc.setTextColor(...GREEN);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MON JETON", 14, 18);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Votre coach financier intelligent", 14, 27);
  doc.text("Tu vas voir clair dans ton jeton !", 14, 34);

  doc.setTextColor(170, 170, 170);
  doc.setFontSize(10);
  doc.text(`Rapport — ${data.month}`, w - 14, 20, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, w - 14, 28, { align: "right" });

  let y = 50;

  // ── SUMMARY CARDS ──
  const balance = data.totalIncome - data.totalExpense;
  const savingsRate = data.totalIncome > 0
    ? Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)
    : 0;

  const cards = [
    { label: "REVENUS", value: data.totalIncome, color: GREEN, bg: LIGHT_GREEN },
    { label: "DÉPENSES", value: data.totalExpense, color: RED, bg: [255, 245, 245] as [number, number, number] },
    { label: "SOLDE NET", value: balance, color: balance >= 0 ? GREEN : RED, bg: LIGHT_GRAY },
    { label: "TAUX ÉPARGNE", value: savingsRate, color: GREEN, bg: LIGHT_GREEN, isPct: true },
  ];

  const cardW = (w - 28 - 9) / 4;
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardW, 22, 2, 2, "F");
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardW, 22, 2, 2, "S");

    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(card.label, x + cardW / 2, y + 6, { align: "center" });

    doc.setTextColor(...card.color);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const val = card.isPct
      ? `${card.value}%`
      : `${Math.abs(card.value).toLocaleString("fr-FR")} F`;
    doc.text(val, x + cardW / 2, y + 16, { align: "center" });
  });

  y += 30;

  // ── CATEGORIES TABLE ──
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Dépenses par catégorie", 14, y);
  doc.setFillColor(...GREEN);
  doc.rect(14, y + 2, w - 28, 0.8, "F");
  y += 8;

  if (data.categories.length > 0) {
    const catRows = data.categories.map((cat) => {
      const pct = data.totalExpense > 0
        ? Math.round((cat.value / data.totalExpense) * 100) : 0;
      const bars = Math.round(pct / 5);
      const bar = "█".repeat(bars) + "░".repeat(20 - bars);
      return [
        cat.name,
        cat.value.toLocaleString("fr-FR") + " F",
        pct + "%",
        bar,
      ];
    });

    // Total row
    catRows.push([
      "TOTAL",
      data.totalExpense.toLocaleString("fr-FR") + " F",
      "100%",
      "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Catégorie", "Montant (FCFA)", "% Budget", "Répartition visuelle"]],
      body: catRows,
      theme: "grid",
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 5,
        lineColor: GREEN,
        lineWidth: { bottom: 1.5 },
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: "auto", font: "courier", fontSize: 7, textColor: [126, 200, 69] },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      footStyles: { fillColor: LIGHT_GREEN, fontStyle: "bold", textColor: DARK },
      willDrawCell: (data) => {
        if (data.row.index === catRows.length - 1) {
          data.cell.styles.fillColor = LIGHT_GREEN;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = DARK;
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── MONTHLY EVOLUTION TABLE ──
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Évolution mensuelle", 14, y);
  doc.setFillColor(...GREEN);
  doc.rect(14, y + 2, w - 28, 0.8, "F");
  y += 8;

  if (data.monthlyData.length > 0) {
    const evRows = data.monthlyData.map((m, i) => {
      const bal = m.revenus - m.depenses;
      const prev = i > 0 ? data.monthlyData[i - 1].revenus - data.monthlyData[i - 1].depenses : bal;
      const trend = bal >= prev ? "↑" : "↓";
      return [
        m.month,
        m.revenus.toLocaleString("fr-FR"),
        m.depenses.toLocaleString("fr-FR"),
        (bal >= 0 ? "+" : "") + bal.toLocaleString("fr-FR"),
        trend,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Mois", "Revenus (F)", "Dépenses (F)", "Solde (F)", "Tend."]],
      body: evRows,
      theme: "grid",
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 5,
        lineColor: GREEN,
        lineWidth: { bottom: 1.5 },
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 38, halign: "right", textColor: [39, 174, 96] },
        2: { cellWidth: 38, halign: "right", textColor: [231, 76, 60] },
        3: { cellWidth: 38, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 15, halign: "center", fontSize: 12 },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── FOOTER ──
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GREEN);
    doc.rect(0, ph - 12, w, 12, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Mon Jeton — Rapport financier confidentiel", 14, ph - 4.5);
    doc.text(`Page ${i}/${pages}`, w - 14, ph - 4.5, { align: "right" });
  }

  doc.save(`monjeton-rapport-${data.month.replace(/\s/g, "-")}.pdf`);
};
