import { supabase } from "@/integrations/supabase/client";

// Fixed notification id so we can cancel/replace it reliably.
const PET_REMINDER_ID = 424242;

const PET_MESSAGES = [
  "Ton panda réclame un en-cas 🐼 Note une dépense pour le régaler !",
  "Psst… ton compagnon s'ennuie 🥺 Reviens noter tes dépenses !",
  "Ton animal a un petit creux 🍙 Nourris-le en ajoutant une transaction !",
  "Ça fait un moment ! Ton compagnon t'attend pour grignoter 🐾",
];

const pickMessage = () =>
  PET_MESSAGES[Math.floor(Math.random() * PET_MESSAGES.length)];

/**
 * Compute the next reminder date: in ~3 days, at 19:00 local time.
 * Adds a small random jitter (0-1 day) to feel less robotic.
 */
const nextReminderDate = (): Date => {
  const d = new Date();
  const daysAhead = 3 + Math.floor(Math.random() * 2); // 3 or 4
  d.setDate(d.getDate() + daysAhead);
  d.setHours(19, 0, 0, 0);
  return d;
};

const cancelPetReminder = async () => {
  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    await LocalNotifications.cancel({
      notifications: [{ id: PET_REMINDER_ID }],
    });
  } catch {
    // No-op on web / when plugin unavailable.
  }
};

/**
 * Schedule (or reschedule) the pet reminder for ~3-4 days from now.
 * Safe to call multiple times: cancels any previous instance first.
 */
export const schedulePetReminder = async (): Promise<void> => {
  const title = "🐾 Ton compagnon a faim";
  const body = pickMessage();
  const at = nextReminderDate();

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return;
    }
    // Replace any pending reminder.
    await LocalNotifications.cancel({
      notifications: [{ id: PET_REMINDER_ID }],
    });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: PET_REMINDER_ID,
          title,
          body,
          schedule: { at },
          extra: { kind: "pet_reminder" },
        },
      ],
    });
  } catch {
    // Web fallback: we can't truly schedule, but we can at least make sure
    // the user has granted notification permission for future native runs.
    if (typeof window !== "undefined" && "Notification" in window) {
      if (
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }
    }
  }
};

interface PetActivityContext {
  userId: string;
}

/**
 * Check the user's last transaction date and decide what to do:
 *  - Recent activity (< 3 days)  → cancel any pending reminder.
 *  - Inactive (>= 3 days or none) → schedule a fresh reminder.
 */
export const checkPetActivity = async ({
  userId,
}: PetActivityContext): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("checkPetActivity error:", error);
      return;
    }

    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    if (data?.date) {
      const last = new Date(data.date).getTime();
      if (now - last < threeDaysMs) {
        await cancelPetReminder();
        return;
      }
    }

    await schedulePetReminder();
  } catch (e) {
    console.error("checkPetActivity error:", e);
  }
};

/**
 * Called after a successful transaction insert to "feed" the pet:
 * cancels the pending reminder and re-arms it for ~3-4 days from now.
 */
export const rearmPetReminder = async (): Promise<void> => {
  await schedulePetReminder();
};
