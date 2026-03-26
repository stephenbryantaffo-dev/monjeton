import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  categories: { name: string; value: number }[];
  monthlyData: { month: string; revenus: number; depenses: number }[];
}

const fmt = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export const generateMonthlyPdf = (data: PdfData) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  const GREEN: [number, number, number] = [126, 200, 69];
  const DARK: [number, number, number] = [26, 26, 46];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GRAY: [number, number, number] = [136, 136, 136];
  const LIGHT_GREEN: [number, number, number] = [240, 255, 244];
  const RED: [number, number, number] = [231, 76, 60];
  const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

  // HEADER
  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, 38, "F");
  doc.setFillColor(...GREEN);
  doc.rect(0, 38, w, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...GREEN);
  doc.text("MON JETON", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("Votre coach financier intelligent", 14, 27);

  doc.setTextColor(170, 170, 170);
  doc.setFontSize(10);
  doc.text("Rapport - " + data.month, w - 14, 20, { align: "right" });
  doc.setFontSize(8);
  doc.text("Genere le " + new Date().toLocaleDateString("fr-FR"), w - 14, 28, { align: "right" });

  let y = 50;

  // SUMMARY CARDS
  const balance = data.totalIncome - data.totalExpense;
  const savingsRate = data.totalIncome > 0
    ? Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)
    : 0;

  const cards = [
    { label: "REVENUS", value: fmt(data.totalIncome) + " F", color: GREEN, bg: LIGHT_GREEN },
    { label: "DEPENSES", value: fmt(data.totalExpense) + " F", color: RED, bg: [255, 245, 245] as [number, number, number] },
    { label: "SOLDE NET", value: (balance >= 0 ? "+" : "") + fmt(balance) + " F", color: balance >= 0 ? GREEN : RED, bg: LIGHT_GRAY },
    { label: "EPARGNE", value: savingsRate + "%", color: GREEN, bg: LIGHT_GREEN },
  ];

  const cardW = (w - 28 - 9) / 4;
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardW, 22, 2, 2, "F");
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardW, 22, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(card.label, x + cardW / 2, y + 7, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + cardW / 2, y + 16, { align: "center" });
  });

  y += 30;

  // CATEGORIES TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Depenses par categorie", 14, y);
  doc.setFillColor(...GREEN);
  doc.rect(14, y + 2, w - 28, 0.8, "F");
  y += 8;

  if (data.categories.length > 0) {
    const total = data.categories.reduce((s, c) => s + c.value, 0);
    const catRows = data.categories.map((cat) => {
      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
      const bars = Math.round(pct / 5);
      const bar = "X".repeat(bars) + ".".repeat(20 - bars);
      return [cat.name, fmt(cat.value) + " F", pct + "%", bar];
    });

    catRows.push(["TOTAL", fmt(total) + " F", "100%", ""]);

    autoTable(doc, {
      startY: y,
      head: [["Categorie", "Montant (FCFA)", "% Budget", "Repartition"]],
      body: catRows,
      theme: "grid",
      headStyles: {
        fillColor: DARK, textColor: WHITE,
        fontStyle: "bold", fontSize: 9, cellPadding: 5,
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: "auto", fontSize: 7, textColor: GREEN },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      willDrawCell: (hookData) => {
        if (hookData.row.index === catRows.length - 1) {
          hookData.cell.styles.fillColor = LIGHT_GREEN;
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // MONTHLY EVOLUTION TABLE
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Evolution mensuelle", 14, y);
  doc.setFillColor(...GREEN);
  doc.rect(14, y + 2, w - 28, 0.8, "F");
  y += 8;

  if (data.monthlyData.length > 0) {
    const evRows = data.monthlyData.map((m, i) => {
      const bal = m.revenus - m.depenses;
      const prev = i > 0 ? data.monthlyData[i - 1].revenus - data.monthlyData[i - 1].depenses : bal;
      return [
        m.month,
        fmt(m.revenus),
        fmt(m.depenses),
        (bal >= 0 ? "+" : "") + fmt(bal),
        bal >= prev ? "+" : "-",
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Mois", "Revenus (F)", "Depenses (F)", "Solde (F)", "Tend."]],
      body: evRows,
      theme: "grid",
      headStyles: {
        fillColor: DARK, textColor: WHITE,
        fontStyle: "bold", fontSize: 9, cellPadding: 5,
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 38, halign: "right", textColor: [39, 174, 96] as [number, number, number] },
        2: { cellWidth: 38, halign: "right", textColor: RED },
        3: { cellWidth: 38, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 15, halign: "center", fontSize: 12 },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
    });
  }

  // FOOTER
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GREEN);
    doc.rect(0, ph - 12, w, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("Mon Jeton - Rapport financier confidentiel", 14, ph - 4.5);
    doc.text("Page " + i + "/" + pages, w - 14, ph - 4.5, { align: "right" });
  }

  doc.save("monjeton-rapport-" + data.month.replace(/\s/g, "-") + ".pdf");
};
