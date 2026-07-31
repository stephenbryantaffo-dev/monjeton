import type { LucideIcon } from "lucide-react";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, SkipForward, Users, GraduationCap, Briefcase, Building2, User, Home, Building, UtensilsCrossed, Car, Smartphone, Shirt, Pill, Gamepad2, Tv, Music, Dumbbell, Cloud, X, Sprout, TrendingUp, Trophy, AlertTriangle, PiggyBank, CreditCard, BarChart3, Rocket, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/layout/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { LocaleSetupStep } from "@/components/onboarding/LocaleSetupStep";

// ── Types ──
interface StepQuestion {
  id: string;
  title: string;
  options: {
    label: string;
    value: string;
    /** Icône Lucide, pour les options qualitatives. */
    icon?: LucideIcon;
    /** Niveau 1..5, pour les options qui forment une échelle (tranches de montant). */
    level?: number;
  }[];
  multi?: boolean;
  optional?: boolean;
  condition?: (answers: Answers) => boolean;
}

interface Answers {
  profile_type?: string;
  gender?: string;
  living_situation?: string;
  income_range?: string;
  main_expense?: string;
  subscriptions?: string[];
  has_employees?: string;
  employee_count?: string;
  business_age?: string;
  dependents_count?: string;
  children_schooled?: string;
  beauty_budget_range?: string;
  financial_goal?: string;
}

// ── All questions ──
const ALL_QUESTIONS: StepQuestion[] = [
  {
    id: "profile_type",
    title: "Tu es...",
    options: [
      { label: "Parent / Chef de famille", icon: Users, value: "parent" },
      { label: "Étudiant(e)", icon: GraduationCap, value: "étudiant" },
      { label: "Salarié(e)", icon: Briefcase, value: "salarié" },
      { label: "Entrepreneur / Freelance", icon: Building2, value: "entrepreneur" },
      { label: "Autre", icon: User, value: "autre" },
    ],
  },
  {
    id: "gender",
    title: "Tu es...",
    options: [
      { label: "Un homme", icon: User, value: "homme" },
      { label: "Une femme", icon: User, value: "femme" },
    ],
  },
  {
    id: "living_situation",
    title: "Tu vis...",
    options: [
      { label: "Seul(e)", icon: Home, value: "seul" },
      { label: "En famille", icon: Users, value: "famille" },
      { label: "En colocation", icon: Building, value: "colocation" },
      { label: "Avec parents", icon: Users, value: "parents" },
    ],
  },
  {
    id: "income_range",
    title: "Ton revenu mensuel se situe dans quelle tranche ?",
    condition: (a) => ["salarié", "entrepreneur", "autre"].includes(a.profile_type || ""),
    options: [
      { label: "Moins de 100 000 FCFA", level: 1, value: "0-100k" },
      { label: "100 000 - 300 000 FCFA", level: 2, value: "100-300k" },
      { label: "300 000 - 700 000 FCFA", level: 3, value: "300-700k" },
      { label: "700 000 - 1 500 000 FCFA", level: 4, value: "700k-1.5M" },
      { label: "Plus de 1 500 000 FCFA", level: 5, value: "1.5M+" },
    ],
  },
  {
    id: "income_range",
    title: "L'argent que tu reçois par mois ?",
    condition: (a) => a.profile_type === "étudiant",
    options: [
      { label: "Moins de 30 000 FCFA", level: 1, value: "0-30k" },
      { label: "30 000 - 75 000 FCFA", level: 2, value: "30-75k" },
      { label: "75 000 - 150 000 FCFA", level: 3, value: "75-150k" },
      { label: "Plus de 150 000 FCFA", level: 4, value: "150k+" },
    ],
  },
  {
    id: "income_range",
    title: "Les revenus de ton foyer par mois ?",
    condition: (a) => a.profile_type === "parent",
    options: [
      { label: "Moins de 100 000 FCFA", level: 1, value: "0-100k" },
      { label: "100 000 - 300 000 FCFA", level: 2, value: "100-300k" },
      { label: "300 000 - 700 000 FCFA", level: 3, value: "300-700k" },
      { label: "700 000 - 1 500 000 FCFA", level: 4, value: "700k-1.5M" },
      { label: "Plus de 1 500 000 FCFA", level: 5, value: "1.5M+" },
    ],
  },
  {
    id: "dependents_count",
    title: "Combien de personnes dépendent de toi ?",
    condition: (a) => a.profile_type === "parent",
    options: [
      { label: "1-2", icon: User, value: "1-2" },
      { label: "3-4", icon: Users, value: "3-4" },
      { label: "5-6", icon: Users, value: "5-6" },
      { label: "Plus de 6", icon: Users, value: "6+" },
    ],
  },
  {
    id: "main_expense",
    title: "Ta plus grosse dépense mensuelle ?",
    options: [
      { label: "Nourriture / Alimentation", icon: UtensilsCrossed, value: "alimentation" },
      { label: "Loyer / Logement", icon: Home, value: "loyer" },
      { label: "Transport", icon: Car, value: "transport" },
      { label: "Téléphone / Abonnements", icon: Smartphone, value: "téléphone" },
      { label: "Vêtements / Beauté", icon: Shirt, value: "vêtements" },
      { label: "Scolarité / Formation", icon: GraduationCap, value: "scolarité" },
      { label: "Santé", icon: Pill, value: "santé" },
      { label: "Loisirs / Sorties", icon: Gamepad2, value: "loisirs" },
    ],
  },
  {
    id: "subscriptions",
    title: "Tu as des abonnements en cours ?",
    multi: true,
    options: [
      { label: "Netflix / Canal+", icon: Tv, value: "streaming-video" },
      { label: "Spotify / Apple Music", icon: Music, value: "streaming-audio" },
      { label: "Forfait data mensuel", icon: Smartphone, value: "data" },
      { label: "Salle de sport", icon: Dumbbell, value: "sport" },
      { label: "Cloud / Apps payantes", icon: Cloud, value: "cloud" },
      { label: "Aucun", icon: X, value: "aucun" },
    ],
  },
  {
    id: "has_employees",
    title: "Tu as des employés ?",
    condition: (a) => a.profile_type === "entrepreneur",
    options: [
      { label: "Non", icon: User, value: "non" },
      { label: "1-2", icon: Users, value: "1-2" },
      { label: "3-5", icon: Users, value: "3-5" },
      { label: "6-10", icon: Users, value: "6-10" },
      { label: "Plus de 10", icon: Building2, value: "10+" },
    ],
  },
  {
    id: "business_age",
    title: "Ton business tourne depuis ?",
    condition: (a) => a.profile_type === "entrepreneur",
    options: [
      { label: "Moins d'1 an", icon: Sprout, value: "<1an" },
      { label: "1-3 ans", icon: TrendingUp, value: "1-3ans" },
      { label: "Plus de 3 ans", icon: Trophy, value: "3ans+" },
    ],
  },
  {
    id: "children_schooled",
    title: "Les enfants sont scolarisés ?",
    condition: (a) => a.profile_type === "parent" && ["3-4", "5-6", "6+"].includes(a.dependents_count || ""),
    options: [
      { label: "Tous", icon: Check, value: "tous" },
      { label: "Certains", icon: AlertTriangle, value: "certains" },
      { label: "Non", icon: X, value: "non" },
    ],
  },
  {
    id: "beauty_budget_range",
    title: "Tu alloues combien à ta beauté/vêtements par mois ?",
    condition: (a) => a.gender === "femme",
    options: [
      { label: "Moins de 10 000 F", level: 1, value: "<10k" },
      { label: "10 000 - 30 000 F", level: 2, value: "10-30k" },
      { label: "30 000 - 75 000 F", level: 3, value: "30-75k" },
      { label: "Plus de 75 000 F", level: 5, value: "75k+" },
    ],
  },
  {
    id: "financial_goal",
    title: "Ton objectif principal avec Mon Jeton ?",
    options: [
      { label: "Épargner plus", icon: PiggyBank, value: "épargner" },
      { label: "Rembourser des dettes", icon: CreditCard, value: "dettes" },
      { label: "Comprendre où va mon argent", icon: BarChart3, value: "comprendre" },
      { label: "Investir", icon: Rocket, value: "investir" },
      { label: "Équilibrer mes dépenses", icon: Scale, value: "équilibrer" },
    ],
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const Onboarding = () => {
  const { user, refreshProfile, updateProfileLocal } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [shouldSave, setShouldSave] = useState(false);
  const [inviteContext, setInviteContext] = useState<string | null>(null);
  const [localeConfirmed, setLocaleConfirmed] = useState(false);

  useEffect(() => {
    setInviteContext(localStorage.getItem('invite_context'));
  }, []);

  // Compute visible questions based on current answers
  const visibleQuestions = useMemo(() => {
    const seen = new Set<string>();
    return ALL_QUESTIONS.filter((q) => {
      if (q.condition && !q.condition(answers)) return false;
      if (seen.has(q.id) && ["income_range"].includes(q.id)) return false;
      seen.add(q.id);
      return true;
    });
  }, [answers]);

  // Stabilize currentIndex when visibleQuestions shrinks
  useEffect(() => {
    if (currentIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentIndex(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentIndex]);

  const totalSteps = visibleQuestions.length;
  const currentQuestion = visibleQuestions[currentIndex];
  const isLast = currentIndex >= totalSteps - 1;

  const currentAnswer = currentQuestion?.multi
    ? multiSelection
    : answers[currentQuestion?.id as keyof Answers];

  const hasAnswer = currentQuestion?.multi
    ? multiSelection.length > 0
    : !!currentAnswer;

  const handleSelect = useCallback((value: string) => {
    if (!currentQuestion) return;
    if (currentQuestion.multi) {
      setMultiSelection((prev) => {
        if (value === "aucun") return ["aucun"];
        const without = prev.filter((v) => v !== "aucun");
        return without.includes(value)
          ? without.filter((v) => v !== value)
          : [...without, value];
      });
    } else {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    }
  }, [currentQuestion]);

  const goNext = useCallback(() => {
    if (!currentQuestion) return;
    if (currentQuestion.multi) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: multiSelection }));
      setMultiSelection([]);
    }
    if (isLast) {
      setShouldSave(true);
    } else {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentQuestion, isLast, multiSelection]);

  const handleSkip = useCallback(() => {
    if (isLast) {
      setShouldSave(true);
    } else {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  }, [isLast]);

  // Trigger save via effect to avoid stale closure
  useEffect(() => {
    if (shouldSave) {
      setShouldSave(false);
      handleSave();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSave]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const finalAnswers = { ...answers };
    if (currentQuestion?.multi) {
      (finalAnswers as any)[currentQuestion.id] = multiSelection;
    }

    try {
      const profileUpdate: TablesUpdate<"profiles"> = {
        profile_type: finalAnswers.profile_type || null,
        gender: finalAnswers.gender || null,
        living_situation: finalAnswers.living_situation || null,
        income_range: finalAnswers.income_range || null,
        main_expense: finalAnswers.main_expense || null,
        financial_goal: finalAnswers.financial_goal || null,
        has_employees: finalAnswers.has_employees ? finalAnswers.has_employees !== "non" : null,
        dependents_count: finalAnswers.dependents_count
          ? ({ "1-2": 2, "3-4": 4, "5-6": 6, "6+": 7 } as Record<string, number>)[finalAnswers.dependents_count] || null
          : null,
        subscriptions: Array.isArray(finalAnswers.subscriptions) ? finalAnswers.subscriptions : null,
        beauty_budget_range: finalAnswers.beauty_budget_range || null,
        onboarding_completed: true,
      };

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", user.id);

      if (error) throw error;

      // Optimistic local update to prevent OnboardingGuard race-redirect
      updateProfileLocal({ ...profileUpdate });
      try { sessionStorage.setItem("onboarding_just_completed", "1"); } catch {}

      await refreshProfile();

      // Create adapted categories based on profile
      const extraCategories: { name: string; icon: string; color: string; type: string }[] = [];
      if (finalAnswers.gender === "femme") {
        extraCategories.push({ name: "Beauté & Vêtements", icon: "Sparkles", color: "hsl(330, 70%, 55%)", type: "expense" });
      }
      if (finalAnswers.profile_type === "entrepreneur") {
        extraCategories.push({ name: "Charges entreprise", icon: "Building2", color: "hsl(220, 60%, 50%)", type: "expense" });
      }
      if (finalAnswers.profile_type === "étudiant") {
        extraCategories.push({ name: "Scolarité", icon: "GraduationCap", color: "hsl(45, 80%, 50%)", type: "expense" });
      }

      if (extraCategories.length > 0) {
        const { data: existing } = await supabase
          .from("categories")
          .select("name")
          .eq("user_id", user.id);

        const existingNames = new Set((existing || []).map((c) => c.name));
        const toInsert = extraCategories
          .filter((c) => !existingNames.has(c.name))
          .map((c) => ({ ...c, user_id: user.id }));

        if (toInsert.length > 0) {
          await supabase.from("categories").insert(toInsert);
        }
      }

      toast({ title: "Bienvenue sur Mon Jeton" });
      const postRedirect = localStorage.getItem('post_onboarding_redirect');
      localStorage.removeItem('post_onboarding_redirect');
      localStorage.removeItem('invite_context');
      // Sécurité : n'autoriser que les chemins internes
      const isSafe = postRedirect
        && postRedirect.startsWith('/')
        && !postRedirect.startsWith('//');
      navigate(isSafe ? postRedirect : "/dashboard", { replace: true });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <Screen hasBottomNav={false} className="relative z-10 h-full">
        <Screen.Header>
          <div className="px-6 pt-6 pb-2">
            {inviteContext === 'caisse' && (
              <div className="mb-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                Bienvenue ! Configure ton compte en 30 secondes, puis tu rejoindras la caisse de ton ami juste après.
              </div>
            )}
            {localeConfirmed && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    Question {currentIndex + 1}/{totalSteps}
                  </span>
                  <button
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <SkipForward className="w-3 h-3" /> Passer
                  </button>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={false}
                    animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </>
            )}
          </div>
        </Screen.Header>

        <Screen.Content className="overflow-y-auto">
          <div className="flex items-start justify-center px-5 py-4">
            <div className="w-full max-w-md bg-background/60 backdrop-blur-md rounded-3xl p-5 shadow-xl border border-border/30">
              {!localeConfirmed ? (
                <LocaleSetupStep onComplete={() => setLocaleConfirmed(true)} />
              ) : (
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={`${currentQuestion.id}-${currentIndex}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <h2 className="text-2xl font-bold text-foreground text-center leading-snug mb-2">
                      {currentQuestion.title}
                    </h2>

                    <div className={`grid gap-3 ${currentQuestion.options.length > 4 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {currentQuestion.options.map((opt) => {
                        const isSelected = currentQuestion.multi
                          ? multiSelection.includes(opt.value)
                          : answers[currentQuestion.id as keyof Answers] === opt.value;

                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`p-3.5 rounded-xl text-sm font-medium transition-all border text-left flex items-center gap-3 ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-secondary/80 text-foreground hover:border-primary/50 hover:bg-primary/5"
                            }`}
                          >
                            <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
                              {"level" in opt && opt.level ? (
                                <span
                                  className="block w-2.5 h-2.5 rounded-full bg-primary"
                                  style={{ opacity: 0.25 + 0.15 * (opt.level as number) }}
                                />
                              ) : "icon" in opt && opt.icon ? (
                                <opt.icon className="w-[18px] h-[18px] text-primary" />
                              ) : null}
                            </span>
                            <span>{opt.label}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </Screen.Content>

        {localeConfirmed && (
          <Screen.StickyAction>
            <Button
              variant="hero"
              size="lg"
              className="w-full gap-2"
              disabled={!hasAnswer || saving}
              onClick={goNext}
            >
              {saving ? "Enregistrement..." : isLast ? "Terminer" : "Suivant"}
              {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </Screen.StickyAction>
        )}
      </Screen>
    </div>
  );
};

export default Onboarding;
