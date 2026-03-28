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

const getJokeAndTips = (
  categories: { name: string; value: number }[],
  totalExpense: number,
  totalIncome: number
) => {
  if (categories.length === 0) return null;

  const top = [...categories].sort((a, b) => b.value - a.value)[0];
  const topName = top.name.toLowerCase();
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

  const jokes: Record<string, { emoji: string; blague: string; tips: string[] }> = {
    transport: {
      emoji: "🚕",
      blague:
        "Gbaka, wôrô-wôrô, Yango… ce mois-ci tu as tellement bougé que même les chauffeurs de gbaka te connaissent par ton prénom ! Prochain mois, pense à covoiturer avec un voisin hein !",
      tips: [
        "Essaie de regrouper tes déplacements sur une même journée pour économiser",
        "Le covoiturage avec des collègues peut réduire ta facture transport de 50%",
        "Pour les trajets courts, la marche c'est gratuit et bon pour la santé !",
        "Compare les prix entre Yango, les gbakas et les wôrô-wôrô selon la distance",
      ],
    },
    alimentation: {
      emoji: "🍛",
      blague:
        "Garba le matin, alloco le midi, kedjenou le soir… tu as vraiment bien mangé ce mois ! Ton ventre dit merci mais ton portefeuille pleure un peu. La prochaine fois, essaie de cuisiner à la maison quelques jours !",
      tips: [
        "Cuisiner à la maison 3 jours par semaine peut diviser ta facture alimentation par 2",
        "Achète tes légumes au marché d'Adjamé plutôt qu'au supermarché",
        "Prépare tes repas en grande quantité le dimanche pour toute la semaine",
        "Le garba reste le meilleur rapport qualité-prix — reste fidèle !",
      ],
    },
    shopping: {
      emoji: "👗",
      blague:
        "Boutique Placard CI, les marchés de Treichville… ce mois-ci tu as bien sapé ! On comprend, il faut être beau/belle. Mais le prochain mois, peut-être juste regarder les vitrines sans acheter ?",
      tips: [
        "Fais une liste de ce dont tu as vraiment besoin avant d'aller faire du shopping",
        "Attends les soldes et promotions avant d'acheter les articles non urgents",
        "La friperie propose de très belles pièces à petit prix",
        "La règle des 48h : si tu veux encore l'article après 48h, alors achète-le",
      ],
    },
    "t\u00e9l\u00e9phone": {
      emoji: "📱",
      blague:
        "Crédit, data, forfait… Orange, MTN, Wave te connaissent bien ce mois ! Tu as peut-être passé plus de temps sur TikTok que prévu. On ne te juge pas, mais ton compte bancaire un peu !",
      tips: [
        "Compare les forfaits data de Orange, MTN et Moov pour trouver le meilleur prix",
        "Le WiFi à la maison coûte moins cher que la data mobile à la longue",
        "Coupe les notifications push des apps pour éviter de consommer data inutilement",
        "Un forfait mensuel revient toujours moins cher que recharger à l'unité",
      ],
    },
    factures: {
      emoji: "💡",
      blague:
        "CIE, SODECI, loyer… les factures ont bien mangé ton argent ce mois ! C'est la vie d'adulte responsable. Mais il y a des astuces pour réduire ça un peu chaque mois.",
      tips: [
        "Éteins les appareils en veille — ça peut réduire ta facture CIE de 15%",
        "Vérifie que tu n'as pas de fuites d'eau pour éviter les surprises SODECI",
        "Négocie ton loyer avec ton propriétaire si tu es locataire depuis plus d'un an",
        "Les ampoules LED consomment 5 fois moins que les ampoules classiques",
      ],
    },
    loisirs: {
      emoji: "🎉",
      blague:
        "Maquis, boîtes, sorties entre amis… ce mois-ci tu as bien profité de la vie ! Abidjan by night te connaît bien. Le plaisir c'est important, mais peut-être réserver un budget 'sortie' fixe chaque mois ?",
      tips: [
        "Fixe un budget loisirs mensuel fixe et respecte-le — par exemple 20% de tes revenus",
        "Les soirées chez soi avec amis coûtent bien moins cher que les sorties en maquis",
        "Cherche les événements gratuits à Abidjan — il y en a plein chaque week-end",
        "Alterne une sortie payante et une sortie gratuite chaque semaine",
      ],
    },
    "sant\u00e9": {
      emoji: "💊",
      blague:
        "Pharmacie, consultations… tu as bien pris soin de toi ce mois ! La santé n'a pas de prix c'est vrai, mais on peut quand même optimiser un peu sans se négliger.",
      tips: [
        "La mutuelle santé peut te faire économiser sur les frais médicaux à long terme",
        "Les médicaments génériques sont aussi efficaces et bien moins chers",
        "Un check-up annuel préventif coûte moins cher qu'une urgence médicale",
        "Boire 2L d'eau par jour et marcher 30min réduit beaucoup les visites chez le médecin",
      ],
    },
  };

  let match: { emoji: string; blague: string; tips: string[] } | null = null;
  for (const [key, joke] of Object.entries(jokes)) {
    if (topName.includes(key) || key.includes(topName)) {
      match = joke;
      break;
    }
  }

  if (!match) {
    if (savingsRate >= 20) {
      match = {
        emoji: "🏆",
        blague: `Waouh ! Tu as épargné ${savingsRate}% de tes revenus ce mois-ci. C'est toi le vrai patron de tes finances ! Tout le quartier peut venir apprendre chez toi !`,
        tips: [
          "Continue comme ça ! Essaie d'investir une partie de ton épargne",
          "Pense à diversifier ton épargne en plusieurs objectifs",
          "Partage tes bonnes habitudes avec ta famille et tes amis",
          "Objectif du prochain mois : augmenter ton taux d'épargne de 2% supplémentaires",
        ],
      };
    } else {
      match = {
        emoji: "💰",
        blague:
          "Ce mois-ci, ton argent a beaucoup voyagé ! Il est parti dans plein de directions. Le prochain mois, essaie de lui donner une destination précise avant qu'il parte tout seul !",
        tips: [
          "La règle 50/30/20 : 50% besoins, 30% envies, 20% épargne",
          "Note chaque dépense pendant 7 jours pour voir où part vraiment ton argent",
          "Fixe-toi un objectif d'épargne précis — même 5 000 F par semaine c'est bien",
          "Utilise Mon Jeton chaque jour pour garder le contrôle de tes finances",
        ],
      };
    }
  }

  return { ...match, topCategory: top.name, topAmount: top.value };
};

export const generateMonthlyPdf = (data: PdfData) => {
  const balance = data.totalIncome - data.totalExpense;
  const savingsRate =
    data.totalIncome > 0
      ? Math.round(
          ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
        )
      : 0;
  const total = data.categories.reduce((s, c) => s + c.value, 0);
  const joke = getJokeAndTips(data.categories, data.totalExpense, data.totalIncome);

  let scoreColor = "#e74c3c";
  let scoreText = "\u00c0 am\u00e9liorer";
  let scoreEmoji = "😬";
  if (savingsRate >= 20) {
    scoreColor = "#27ae60"; scoreText = "Excellent !"; scoreEmoji = "🏆";
  } else if (savingsRate >= 10) {
    scoreColor = "#f39c12"; scoreText = "Correct"; scoreEmoji = "👍";
  } else if (savingsRate >= 0) {
    scoreColor = "#e67e22"; scoreText = "Attention"; scoreEmoji = "⚠️";
  }

  const sortedCats = [...data.categories].sort((a, b) => b.value - a.value);
  const catRows = sortedCats
    .map((cat, idx) => {
      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
      const bars = Math.round(pct / 5);
      const bar = "\u2588".repeat(bars) + "\u2591".repeat(20 - bars);
      const isTop = idx === 0;
      return `<tr>
          <td>${isTop ? "🔥 " : ""}${cat.name}</td>
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

  const tipsHtml = joke
    ? joke.tips
        .map(
          (tip, i) =>
            `<p style="margin:6px 0;padding:8px 12px;background:#f9f9f9;border-radius:6px;border-left:3px solid #7ec845;font-size:12px;"><strong>${i + 1}.</strong> ${tip}</p>`
        )
        .join("")
    : "";

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
.print-hint{background:#e8f5e9;padding:8px 14px;border-radius:6px;font-size:11px;color:#388e3c;margin-bottom:16px;text-align:center}
.score-box{display:flex;align-items:center;gap:16px;padding:16px;border-radius:10px;margin-bottom:20px}
.score-emoji{font-size:40px}
.score-label{font-size:14px;font-weight:bold}
.score-desc{font-size:12px;color:#555;margin-top:4px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
.card{border-radius:8px;padding:14px 10px;text-align:center}
.card .lbl{font-size:9px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:5px}
.card .val{font-size:14px;font-weight:bold}
.card .sub{font-size:9px;color:#999;margin-top:3px}
.cg{background:#f0fff4;border:1px solid #7ec845}
.cr{background:#fff5f5;border:1px solid #e74c3c}
.cgy{background:#f5f5f5;border:1px solid #ccc}
.joke-box{background:linear-gradient(135deg,#fff8e1,#fff3cd);border:1px solid #f0c040;border-radius:10px;padding:16px;margin-bottom:22px}
.joke-box .joke-emoji{font-size:32px;margin-bottom:6px}
.joke-box .joke-top{font-size:12px;font-weight:bold;color:#333;margin-bottom:6px}
.joke-box .joke-text{font-size:12px;color:#555;font-style:italic;line-height:1.5}
.tips-box{background:#f0fff4;border:1px solid #7ec845;border-radius:10px;padding:16px;margin-bottom:22px}
.tips-box .tips-title{font-size:13px;font-weight:bold;color:#1a1a2e;margin-bottom:4px}
.tips-box .tips-sub{font-size:11px;color:#666;margin-bottom:10px}
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
.legend{font-size:10px;color:#999;margin-top:6px}
.footer{margin-top:20px;padding-top:8px;border-top:2px solid #7ec845;display:flex;justify-content:space-between;font-size:10px;color:#888}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hdr,.joke-box,th,.total td,.cg,.cr,.tips-box,.score-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .print-hint{display:none}
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
  <div class="meta">Votre coach financier intelligent \ud83e\ude99</div>
</div>
<div class="body">

  <div class="print-hint">\ud83d\udca1 Pour sauvegarder en PDF : Ctrl+P \u2192 choisir "Enregistrer en PDF"</div>

  <div class="score-box" style="background:${scoreColor}15;border:1px solid ${scoreColor}">
    <div class="score-emoji">${scoreEmoji}</div>
    <div>
      <div class="score-label" style="color:${scoreColor}">Sant\u00e9 financi\u00e8re : ${scoreText}</div>
      <div class="score-desc">
        Ce mois de ${data.month}, tu as \u00e9pargn\u00e9 ${savingsRate}% de tes revenus.
        ${savingsRate >= 20
          ? "Excellent travail ! Tu g\u00e8res ton argent comme un vrai pro."
          : savingsRate >= 10
            ? "Pas mal ! Avec quelques ajustements tu peux faire encore mieux."
            : savingsRate >= 0
              ? "Tu peux faire mieux. Regarde les conseils en bas du rapport."
              : "Attention, tu as d\u00e9pens\u00e9 plus que tu n'as gagn\u00e9 ce mois-ci !"}
      </div>
    </div>
  </div>

  <div class="cards">
    <div class="card cg">
      <div class="lbl">\ud83d\udc9a Revenus</div>
      <div class="val green">${fmt(data.totalIncome)} F</div>
      <div class="sub">Ce que tu as gagn\u00e9</div>
    </div>
    <div class="card cr">
      <div class="lbl">\ud83d\udd34 D\u00e9penses</div>
      <div class="val red">${fmt(data.totalExpense)} F</div>
      <div class="sub">Ce que tu as d\u00e9pens\u00e9</div>
    </div>
    <div class="card cgy">
      <div class="lbl">${balance >= 0 ? "\ud83d\udcb0" : "\u26a0\ufe0f"} Solde net</div>
      <div class="val" style="color:${balance >= 0 ? "#7ec845" : "#e74c3c"}">${balance >= 0 ? "+" : ""}${fmt(balance)} F</div>
      <div class="sub">${balance >= 0 ? "Il te reste \u00e7a" : "Tu as d\u00e9pass\u00e9"}</div>
    </div>
    <div class="card cg">
      <div class="lbl">\ud83c\udfe6 \u00c9pargne</div>
      <div class="val green">${savingsRate}%</div>
      <div class="sub">Objectif : 20%</div>
    </div>
  </div>

  ${joke ? `
  <div class="joke-box">
    <div style="font-size:13px;font-weight:bold;color:#1a1a2e;margin-bottom:8px">\ud83d\ude02 La blague du mois</div>
    <div class="joke-emoji">${joke.emoji}</div>
    <div class="joke-top">Ce mois, ta plus grosse d\u00e9pense : ${joke.topCategory} (${fmt(joke.topAmount)} F)</div>
    <div class="joke-text">"${joke.blague}"</div>
  </div>
  ` : ""}

  <div class="sec">
    <div class="sec-title">\ud83d\udcca O\u00f9 est parti ton argent ?</div>
    <table>
      <thead><tr>
        <th>Cat\u00e9gorie</th><th>Montant</th><th>Part</th><th>Visualisation</th>
      </tr></thead>
      <tbody>
        ${catRows}
        <tr class="total">
          <td>TOTAL D\u00c9PENS\u00c9</td>
          <td class="ra">${fmt(total)} F</td>
          <td class="ca">100%</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="legend">\ud83d\udd25 = Ta plus grosse d\u00e9pense du mois</div>
  </div>

  <div class="sec">
    <div class="sec-title">\ud83d\udcc8 Comment tu \u00e9volues sur 6 mois</div>
    <table>
      <thead><tr>
        <th>Mois</th><th>Revenus</th><th>D\u00e9penses</th><th>Ce qu'il restait</th><th>\u00c9vol.</th>
      </tr></thead>
      <tbody>${evRows}</tbody>
    </table>
    <div class="legend">\u2191 = Mois meilleur que le pr\u00e9c\u00e9dent &nbsp;|&nbsp; \u2193 = Mois moins bon</div>
  </div>

  ${joke ? `
  <div class="tips-box">
    <div class="tips-title">\ud83d\udca1 4 conseils pour le mois prochain</div>
    <div class="tips-sub">\ud83c\udfaf Bas\u00e9 sur tes d\u00e9penses en ${joke.topCategory}, voici ce que tu peux faire :</div>
    ${tipsHtml}
  </div>
  ` : ""}

</div>
<div class="footer">
  <span>\ud83e\ude99 Mon Jeton \u2014 Rapport de ${data.month}</span>
  <span>G\u00e9n\u00e9r\u00e9 automatiquement \u2022 Confidentiel</span>
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
