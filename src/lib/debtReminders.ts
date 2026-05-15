import { supabase } from "@/integrations/supabase/client";
import { formatMoneyDisplay } from "@/lib/formatAmount";
import { normalizePhone } from "@/lib/contactsService";

interface ReminderContext {
  userId: string;
  silent?: boolean;
}

interface PersonInfo {
  name: string;
  phone: string | null;
  whatsapp: string | null;
}

interface DebtInfo {
  id: string;
  type: string;
  person_name: string;
  note?: string | null;
  debt_persons: PersonInfo | null;
}

interface InstallmentRow {
  id: string;
  due_date: string;
  expected_amount: number;
  paid_amount: number;
  debts: DebtInfo | null;
}

const sendWhatsAppReminder = (
  debt: DebtInfo,
  inst: InstallmentRow,
  person: PersonInfo,
  rawPhone: string,
) => {
  const normalized = normalizePhone(rawPhone);
  if (!normalized || normalized.length < 10) return;
  const finalPhone = normalized.startsWith("225")
    ? normalized
    : `225${normalized}`;

  const remaining =
    Number(inst.expected_amount) - Number(inst.paid_amount || 0);
  const dueDate = new Date(inst.due_date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const isOwed = debt.type === "owed_to_me";

  const message = isOwed
    ? `Bonjour *${person.name}* 👋\n\nJe te rappelle qu'un versement de *${formatMoneyDisplay(remaining)} F* est attendu *demain ${dueDate}* 🗓️\n\nMerci de ton sérieux 🙏\n\n_Mon Jeton — monjeton.app_`
    : `Bonjour *${person.name}* 👋\n\nJe te rappelle que je te dois *${formatMoneyDisplay(remaining)} F* demain ${dueDate} 🗓️\n\nJe te fais le virement dès demain 🙏\n\n_Mon Jeton — monjeton.app_`;

  window.open(
    `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`,
    "_blank",
  );
};

const sendPushNotification = async (
  debt: DebtInfo,
  inst: InstallmentRow,
  person: PersonInfo,
) => {
  const remaining =
    Number(inst.expected_amount) - Number(inst.paid_amount || 0);
  const isOwed = debt.type === "owed_to_me";
  const title = isOwed
    ? `💰 Versement attendu demain`
    : `📅 Paiement à effectuer demain`;
  const body = isOwed
    ? `${person.name} doit te verser ${formatMoneyDisplay(remaining)} F`
    : `Tu dois ${formatMoneyDisplay(remaining)} F à ${person.name}`;

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1000000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 1000) },
          extra: { debtId: debt.id, installmentId: inst.id },
        },
      ],
    });
  } catch {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        const p = await Notification.requestPermission();
        if (p === "granted") new Notification(title, { body });
      }
    }
  }
};

export const checkAndSendReminders = async ({
  userId,
  silent = false,
}: ReminderContext) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: installments } = await supabase
      .from("debt_installments")
      .select(
        `id, due_date, expected_amount, paid_amount,
         debts ( id, person_name, type, note,
           debt_persons ( name, phone, whatsapp, photo_uri ) )`,
      )
      .eq("user_id", userId)
      .eq("due_date", tomorrowStr)
      .in("status", ["pending", "partial"])
      .eq("reminder_sent", false);

    if (!installments || installments.length === 0) return;

    for (const raw of installments) {
      const inst = raw as unknown as InstallmentRow;
      const debt = inst.debts;
      if (!debt) continue;
      const person: PersonInfo = debt.debt_persons || {
        name: debt.person_name,
        phone: null,
        whatsapp: null,
      };
      const phone = person.whatsapp || person.phone;

      await supabase
        .from("debt_installments")
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
        })
        .eq("id", inst.id);

      await supabase.from("debt_history").insert({
        debt_id: debt.id,
        user_id: userId,
        action: "reminder_sent",
        field: "installment",
        new_value: inst.id,
        amount: inst.expected_amount,
        note: `Rappel envoyé pour échéance du ${tomorrowStr}`,
      });

      if (phone && !silent) {
        sendWhatsAppReminder(debt, inst, person, phone);
      }
      await sendPushNotification(debt, inst, person);
    }
  } catch (e) {
    console.error("checkReminders error:", e);
  }
};

export const checkOverdueDebts = async (userId: string) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueInst } = await supabase
      .from("debt_installments")
      .select("id")
      .eq("user_id", userId)
      .lt("due_date", today)
      .in("status", ["pending", "partial"]);

    if (!overdueInst || overdueInst.length === 0) return;

    const ids = overdueInst.map((i) => i.id);
    await supabase
      .from("debt_installments")
      .update({ status: "overdue" })
      .in("id", ids);

    try {
      const { LocalNotifications } = await import(
        "@capacitor/local-notifications"
      );
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999999,
            title: `⚠️ ${overdueInst.length} versement(s) en retard`,
            body: `Vérifie tes dettes Mon Jeton`,
            schedule: { at: new Date(Date.now() + 2000) },
          },
        ],
      });
    } catch {
      // silent
    }
  } catch (e) {
    console.error("checkOverdue error:", e);
  }
};
