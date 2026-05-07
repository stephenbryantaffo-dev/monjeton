import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  User,
  Phone,
  Loader2,
  ContactRound,
  Edit3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  type AppContact,
  fetchAllContacts,
  checkContactsPermission,
  requestContactsPermission,
  formatPhoneDisplay,
  isNativeContactsAvailable,
} from "@/lib/contactsService";
import { toast } from "@/hooks/use-toast";

export interface PickedContact {
  name: string;
  phone: string;
  photoUri?: string;
  contactId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: PickedContact) => void;
}

type PermissionState = "unknown" | "granted" | "denied";

export const ContactPicker = ({ open, onClose, onSelect }: Props) => {
  const [contacts, setContacts] = useState<AppContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [permissionState, setPermissionState] =
    useState<PermissionState>("unknown");
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      if (!isNativeContactsAvailable()) {
        setManualMode(true);
        setPermissionState("denied");
        return;
      }
      const has = await checkContactsPermission();
      if (has) {
        setPermissionState("granted");
        loadContacts();
      } else {
        setPermissionState("unknown");
      }
    };
    init();
  }, [open]);

  const askPermissionAndLoad = async () => {
    setLoading(true);
    const granted = await requestContactsPermission();
    if (granted) {
      setPermissionState("granted");
      await loadContacts();
    } else {
      setPermissionState("denied");
      setManualMode(true);
      toast({
        title: "Permission refusée",
        description: "Tu peux saisir le contact manuellement",
      });
    }
    setLoading(false);
  };

  const loadContacts = async () => {
    setLoading(true);
    const data = await fetchAllContacts();
    setContacts(data);
    setLoading(false);
  };

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\s/g, "")),
    );
  }, [contacts, search]);

  const handleSelect = (contact: AppContact, phone?: string) => {
    onSelect({
      name: contact.name,
      phone: phone || contact.phone,
      photoUri: contact.photoUri,
      contactId: contact.id,
    });
    handleClose();
  };

  const handleClose = () => {
    setSearch("");
    setManualName("");
    setManualPhone("");
    setManualMode(false);
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualName.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    onSelect({
      name: manualName.trim(),
      phone: manualPhone.trim(),
    });
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl bg-card overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-base font-black flex items-center gap-2">
                <ContactRound className="w-5 h-5 text-primary" />
                {manualMode ? "Saisie manuelle" : "Choisir un contact"}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permission requise */}
            {permissionState === "unknown" && !manualMode && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <ContactRound className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-base mb-2">
                    Accès au répertoire
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                    Pour t'aider à sélectionner rapidement tes contacts, Mon
                    Jeton a besoin d'accéder à ton répertoire. Tes contacts
                    restent privés et ne quittent pas ton téléphone.
                  </p>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  disabled={loading}
                  onClick={askPermissionAndLoad}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ContactRound className="w-4 h-4" />
                  )}
                  Autoriser l'accès
                </Button>
                <button
                  onClick={() => setManualMode(true)}
                  className="text-xs text-muted-foreground underline"
                >
                  Saisir manuellement à la place
                </button>
              </div>
            )}

            {/* Liste contacts */}
            {permissionState === "granted" && !manualMode && (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un contact..."
                      className="pl-9 bg-secondary border-border"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                      <User className="w-10 h-10 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {search
                          ? "Aucun contact trouvé"
                          : "Aucun contact avec un numéro"}
                      </p>
                      <button
                        onClick={() => setManualMode(true)}
                        className="text-xs text-primary underline mt-2"
                      >
                        Saisir manuellement
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground px-3 py-2">
                        {filteredContacts.length} contact(s)
                      </p>
                      {filteredContacts.map((c) => (
                        <ContactRow
                          key={c.id}
                          contact={c}
                          onSelect={handleSelect}
                        />
                      ))}
                    </>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border">
                  <button
                    onClick={() => setManualMode(true)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Saisir manuellement
                  </button>
                </div>
              </>
            )}

            {/* Saisie manuelle */}
            {manualMode && (
              <div className="flex-1 flex flex-col p-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Nom de la personne *
                  </Label>
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Ex: Karim"
                    className="bg-secondary border-border"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Numéro de téléphone (optionnel)
                  </Label>
                  <Input
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="07 XX XX XX XX"
                    inputMode="tel"
                    className="bg-secondary border-border"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Permet d'envoyer un rappel WhatsApp directement
                  </p>
                </div>

                <div className="mt-auto space-y-2">
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={handleManualSubmit}
                  >
                    Valider
                  </Button>
                  {isNativeContactsAvailable() &&
                    permissionState !== "denied" && (
                      <button
                        onClick={() => {
                          setManualMode(false);
                          if (permissionState === "unknown") {
                            askPermissionAndLoad();
                          }
                        }}
                        className="w-full text-xs text-muted-foreground underline"
                      >
                        ← Choisir depuis le répertoire
                      </button>
                    )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ContactRow = ({
  contact,
  onSelect,
}: {
  contact: AppContact;
  onSelect: (c: AppContact, phone?: string) => void;
}) => {
  const [showAllPhones, setShowAllPhones] = useState(false);
  const hasMultiple = contact.phones.length > 1;

  return (
    <div>
      <button
        onClick={() => {
          if (hasMultiple) {
            setShowAllPhones(!showAllPhones);
          } else {
            onSelect(contact);
          }
        }}
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-xl transition-colors active:scale-[0.99]"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {contact.photoUri ? (
            <img
              src={contact.photoUri}
              alt={contact.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold truncate">{contact.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums truncate">
            {formatPhoneDisplay(contact.phone)}
            {hasMultiple && ` · ${contact.phones.length} numéros`}
          </p>
        </div>
      </button>

      {showAllPhones && hasMultiple && (
        <div className="ml-12 pl-1 mb-2 space-y-1">
          {contact.phones.map((p) => (
            <button
              key={p}
              onClick={() => onSelect(contact, p)}
              className="w-full text-left p-2 rounded-lg hover:bg-secondary text-xs text-muted-foreground tabular-nums flex items-center gap-2"
            >
              <Phone className="w-3 h-3" />
              {formatPhoneDisplay(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
