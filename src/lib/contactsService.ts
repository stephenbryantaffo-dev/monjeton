import { Contacts, type ProjectionInput } from "@capacitor-community/contacts";
import { Capacitor } from "@capacitor/core";

export interface AppContact {
  id: string;
  name: string;
  phone: string;
  phones: string[];
  photoUri?: string;
}

// Normaliser un numéro pour la Côte d'Ivoire : 225XXXXXXXXXX
export const normalizePhone = (raw: string): string => {
  if (!raw) return "";
  let cleaned = raw.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+225")) {
    cleaned = cleaned.substring(1); // 225...
  } else if (cleaned.startsWith("00225")) {
    cleaned = cleaned.substring(2); // 225...
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "225" + cleaned.substring(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith("225")) {
    cleaned = "225" + cleaned;
  }

  return cleaned;
};

// Format d'affichage : 07 78 36 19 88
export const formatPhoneDisplay = (phone: string): string => {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 10) return phone;

  const local = normalized.startsWith("225")
    ? "0" + normalized.substring(3)
    : normalized;

  if (local.length !== 10) return phone;

  return local.match(/.{2}/g)?.join(" ") || phone;
};

export const isNativeContactsAvailable = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const checkContactsPermission = async (): Promise<boolean> => {
  if (!isNativeContactsAvailable()) return false;
  try {
    const result = await Contacts.checkPermissions();
    return result.contacts === "granted";
  } catch {
    return false;
  }
};

export const requestContactsPermission = async (): Promise<boolean> => {
  if (!isNativeContactsAvailable()) return false;
  try {
    const result = await Contacts.requestPermissions();
    return result.contacts === "granted";
  } catch {
    return false;
  }
};

export const fetchAllContacts = async (): Promise<AppContact[]> => {
  if (!isNativeContactsAvailable()) return [];
  try {
    const projection: ProjectionInput = {
      name: true,
      phones: true,
      image: true,
    };
    const result = await Contacts.getContacts({ projection });

    return (result.contacts || [])
      .map((c) => {
        const phones = (c.phones || [])
          .map((p) => p.number || "")
          .filter(Boolean)
          .map(normalizePhone)
          .filter((p) => p.length >= 10);

        const photoBase64 = c.image?.base64String;
        return {
          id: c.contactId || crypto.randomUUID(),
          name:
            c.name?.display ||
            [c.name?.given, c.name?.family].filter(Boolean).join(" ") ||
            "Sans nom",
          phone: phones[0] || "",
          phones: Array.from(new Set(phones)),
          photoUri: photoBase64
            ? `data:image/jpeg;base64,${photoBase64}`
            : undefined,
        } as AppContact;
      })
      .filter((c) => c.phone)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } catch (e) {
    console.error("fetchContacts error:", e);
    return [];
  }
};
