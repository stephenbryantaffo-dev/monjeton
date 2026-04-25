import { supabase } from "@/integrations/supabase/client";
import type { TontineMember } from "@/components/tontine/types";

export type TontineNotifType =
  | "rappel_cotisation"
  | "nouveau_cycle"
  | "bienvenue"
  | "cloture"
  | "systeme";

interface NotifOptions {
  tontineId: string;
  membreId?: string | null;
  type: TontineNotifType;
  message: string;
  canal?: "whatsapp" | "systeme" | "sms";
}

/** Logger une notification dans Supabase (table tontine_notifications) */
export const logNotification = async (opts: NotifOptions) => {
  await supabase.from("tontine_notifications" as any).insert({
    tontine_id: opts.tontineId,
    membre_id: opts.membreId || null,
    type: opts.type,
    message: opts.message,
    canal: opts.canal || "whatsapp",
    statut: "envoye",
  } as any);
};

const fmtMoney = (n: number) => Number(n || 0).toLocaleString("fr-FR");

const buildMessage = (
  tontineName: string,
  membre: { name: string },
  type: TontineNotifType,
  extra: { montant?: number; cycleNumero?: number; dateProchaineEcheance?: string }
): string => {
  if (type === "rappel_cotisation") {
    return (
      `Bonjour ${membre.name} 👋\n\n` +
      `Rappel pour la tontine *${tontineName}*.\n\n` +
      `Ta cotisation de *${fmtMoney(extra.montant || 0)} F CFA* ` +
      `pour le cycle *${extra.cycleNumero}* n'a pas encore été enregistrée.\n\n` +
      (extra.dateProchaineEcheance
        ? `📅 Date limite : *${extra.dateProchaineEcheance}*\n\n`
        : "") +
      `Merci de procéder au paiement dès que possible. 🙏\n\n` +
      `_Mon Jeton — jetonclair.com_`
    );
  }
  if (type === "nouveau_cycle") {
    return (
      `Bonjour ${membre.name} 👋\n\n` +
      `🔔 Nouveau cycle ouvert dans la tontine *${tontineName}* !\n\n` +
      `📌 Cycle numéro : *${extra.cycleNumero}*\n` +
      `💰 Montant à cotiser : *${fmtMoney(extra.montant || 0)} F CFA*\n\n` +
      (extra.dateProchaineEcheance
        ? `📅 Date limite : *${extra.dateProchaineEcheance}*\n\n`
        : "") +
      `Sois parmi les premiers à cotiser ! 💪\n\n` +
      `_Mon Jeton — jetonclair.com_`
    );
  }
  if (type === "bienvenue") {
    return (
      `Bonjour ${membre.name} 👋\n\n` +
      `Tu as été ajouté(e) à la tontine *${tontineName}* sur Mon Jeton.\n\n` +
      `💰 Cotisation : *${fmtMoney(extra.montant || 0)} F CFA*\n\n` +
      `Tu recevras des notifications pour chaque nouveau cycle. 📲\n\n` +
      `_Mon Jeton — jetonclair.com_`
    );
  }
  if (type === "cloture") {
    return (
      `Bonjour ${membre.name} 👋\n\n` +
      `La tontine *${tontineName}* a été clôturée par l'administrateur.\n\n` +
      `Merci pour ta participation ! 🙏\n\n` +
      `_Mon Jeton — jetonclair.com_`
    );
  }
  return "";
};

/** Ouvre WhatsApp avec message pré-rempli + log dans Supabase */
export const sendWhatsAppTontine = async (
  tontineName: string,
  membre: TontineMember,
  type: TontineNotifType,
  extra: {
    montant?: number;
    cycleNumero?: number;
    dateProchaineEcheance?: string;
    tontineId: string;
  }
) => {
  const message = buildMessage(tontineName, membre, type, extra);

  await logNotification({
    tontineId: extra.tontineId,
    membreId: membre.id,
    type,
    message,
    canal: "whatsapp",
  });

  if (membre.phone) {
    const phone = membre.phone.replace(/\s/g, "").replace(/^\+/, "").replace(/^0/, "225");
    const finalPhone = phone.startsWith("225") ? phone : `225${phone}`;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }
  return message;
};

/** Notifie tous les membres qui n'ont pas payé le cycle courant */
export const notifyAllUnpaid = async (
  members: TontineMember[],
  paidMemberIds: Set<string>,
  tontineName: string,
  cycleNumero: number,
  montant: number,
  tontineId: string,
  dateLimite?: string
): Promise<number> => {
  const unpaid = members.filter((m) => !paidMemberIds.has(m.id) && m.phone);
  for (const membre of unpaid) {
    await sendWhatsAppTontine(tontineName, membre, "rappel_cotisation", {
      montant,
      cycleNumero,
      dateProchaineEcheance: dateLimite,
      tontineId,
    });
    await new Promise((r) => setTimeout(r, 800));
  }
  return unpaid.length;
};
