// Parsing pur (sans dépendance Deno) de la réponse Jèko — utilisé à la fois par
// le webhook et par le job de réconciliation, et testable en dehors de Deno.
//
// HYPOTHÈSE NON CONFIRMÉE (Phase 1 du plan pas encore validée via le MCP Jèko) :
// noms de champs, format du montant, distinction .data vs racine. À corriger
// dès que la doc/MCP confirme le schéma réel.

const PRO_LINK_ID = 'd616710c-47fb-4afc-b0e2-e9fe3e0b29ab';
const MAX_LINK_ID = 'e7715547-b693-40dd-b06e-9bbb63a90961';

export interface ParsedJekoTx {
  status: string;
  txType: string;
  isPayment: boolean;
  phoneRaw: string;
  txnId: string;
  paymentLinkId: string;
  reference: string;
  amountXof: number;
  rawAmount: number;
  planName: string;
  priceXof: number;
}

export function parseJekoTransaction(raw: unknown): ParsedJekoTx {
  const parsed = raw as any;
  // La doc se contredit : tantôt champs à la racine, tantôt sous .data.
  const tx = parsed?.data ?? parsed ?? {};

  const status = String(tx?.status ?? '').toLowerCase();
  const txType = String(tx?.transactionType ?? '');
  const isPayment = txType === 'PaymentRequest' || txType.toLowerCase() === 'payment';

  const phoneRaw = String(tx?.counterpartIdentifier ?? '');
  const txnId = String(tx?.id ?? '');
  const paymentLinkId = String(tx?.transactionDetails?.paymentLinkId ?? '');
  const reference = String(tx?.transactionDetails?.reference ?? '');

  // MONTANT : centimes vs XOF direct.
  const rawAmount = Number(tx?.amount?.amount ?? 0);
  const amountXof = rawAmount >= 100000 ? Math.round(rawAmount / 100) : rawAmount;

  let planName = 'Pro';
  let priceXof = 2000;
  if (paymentLinkId.includes(MAX_LINK_ID) || amountXof >= 5000) {
    planName = 'Ultra Pro';
    priceXof = 5000;
  }

  return {
    status,
    txType,
    isPayment,
    phoneRaw,
    txnId,
    paymentLinkId,
    reference,
    amountXof,
    rawAmount,
    planName,
    priceXof,
  };
}

export function phoneDigitVariants(phoneRaw: string): Set<string> {
  const digits = String(phoneRaw ?? '').replace(/[^0-9]/g, '');
  return new Set([digits, digits.replace(/^225/, ''), '225' + digits.replace(/^225/, '')]);
}

export interface PhoneProfile {
  user_id: string;
  phone: string | null;
}

export function matchProfileByPhone(profiles: PhoneProfile[], phoneRaw: string): string | null {
  const variants = phoneDigitVariants(phoneRaw);
  const match = profiles.find((p) => {
    const pd = String(p.phone ?? '').replace(/[^0-9]/g, '');
    if (!pd) return false;
    for (const v of variants) {
      if (v && (pd === v || pd.endsWith(v) || v.endsWith(pd))) return true;
    }
    return false;
  });
  return match?.user_id ?? null;
}
