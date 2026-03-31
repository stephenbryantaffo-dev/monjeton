import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ── Types ──
interface StepQuestion {
  id: string;
  title: string;
  options: { label: string; emoji: string; value: string }[];
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
      { label: "Parent / Chef de famille", emoji: "👨‍👩‍👧", value: "parent" },
      { label: "Étudiant(e)", emoji: "🎓", value: "étudiant" },
      { label: "Salarié(e)", emoji: "💼", value: "salarié" },
      { label: "Entrepreneur / Freelance", emoji: "🏢", value: "entrepreneur" },
      { label: "Autre", emoji: "👤", value: "autre" },
    ],
  },
  {
    id: "gender",
    title: "Tu es...",
    options: [
      { label: "Un homme", emoji: "👨", value: "homme" },
      { label: "Une femme", emoji: "👩", value: "femme" },
    ],
  },
  {
    id: "living_situation",
    title: "Tu vis...",
    options: [
      { label: "Seul(e)", emoji: "🏠", value: "seul" },
      { label: "En famille", emoji: "👨‍👩‍👧", value: "famille" },
      { label: "En colocation", emoji: "🏘️", value: "colocation" },
      { label: "Avec parents", emoji: "👨‍👧", value: "parents" },
    ],
  },
  {
    id: "income_range",
    title: "Ton revenu mensuel se situe dans quelle tranche ?",
    condition: (a) => ["salarié", "entrepreneur", "autre"].includes(a.profile_type || ""),
    options: [
      { label: "Moins de 100 000 FCFA", emoji: "💚", value: "0-100k" },
      { label: "100 000 - 300 000 FCFA", emoji: "💛", value: "100-300k" },
      { label: "300 000 - 700 000 FCFA", emoji: "🟠", value: "300-700k" },
      { label: "700 000 - 1 500 000 FCFA", emoji: "🔵", value: "700k-1.5M" },
      { label: "Plus de 1 500 000 FCFA", emoji: "💜", value: "1.5M+" },
    ],
  },
  {
    id: "income_range",
    title: "L'argent que tu reçois par mois ?",
    condition: (a) => a.profile_type === "étudiant",
    options: [
      { label: "Moins de 30 000 FCFA", emoji: "💚", value: "0-30k" },
      { label: "30 000 - 75 000 FCFA", emoji: "💛", value: "30-75k" },
      { label: "75 000 - 150 000 FCFA", emoji: "🟠", value: "75-150k" },
      { label: "Plus de 150 000 FCFA", emoji: "🔵", value: "150k+" },
    ],
  },
  {
    id: "income_range",
    title: "Les revenus de ton foyer par mois ?",
    condition: (a) => a.profile_type === "parent",
    options: [
      { label: "Moins de 100 000 FCFA", emoji: "💚", value: "0-100k" },
      { label: "100 000 - 300 000 FCFA", emoji: "💛", value: "100-300k" },
      { label: "300 000 - 700 000 FCFA", emoji: "🟠", value: "300-700k" },
      { label: "700 000 - 1 500 000 FCFA", emoji: "🔵", value: "700k-1.5M" },
      { label: "Plus de 1 500 000 FCFA", emoji: "💜", value: "1.5M+" },
    ],
  },
  {
    id: "dependents_count",
    title: "Combien de personnes dépendent de toi ?",
    condition: (a) => a.profile_type === "parent",
    options: [
      { label: "1-2", emoji: "👤", value: "1-2" },
      { label: "3-4", emoji: "👥", value: "3-4" },
      { label: "5-6", emoji: "👨‍👩‍👧‍👦", value: "5-6" },
      { label: "Plus de 6", emoji: "👨‍👩‍👧‍👦", value: "6+" },
    ],
  },
  {
    id: "main_expense",
    title: "Ta plus grosse dépense mensuelle ?",
    options: [
      { label: "Nourriture / Alimentation", emoji: "🍛", value: "alimentation" },
      { label: "Loyer / Logement", emoji: "🏠", value: "loyer" },
      { label: "Transport", emoji: "🚗", value: "transport" },
      { label: "Téléphone / Abonnements", emoji: "📱", value: "téléphone" },
      { label: "Vêtements / Beauté", emoji: "👗", value: "vêtements" },
      { label: "Scolarité / Formation", emoji: "🎓", value: "scolarité" },
      { label: "Santé", emoji: "💊", value: "santé" },
      { label: "Loisirs / Sorties", emoji: "🎮", value: "loisirs" },
    ],
  },
  {
    id: "subscriptions",
    title: "Tu as des abonnements en cours ?",
    multi: true,
    options: [
      { label: "Netflix / Canal+", emoji: "📺", value: "streaming-video" },
      { label: "Spotify / Apple Music", emoji: "🎵", value: "streaming-audio" },
      { label: "Forfait data mensuel", emoji: "📱", value: "data" },
      { label: "Salle de sport", emoji: "🏋️", value: "sport" },
      { label: "Cloud / Apps payantes", emoji: "☁️", value: "cloud" },
      { label: "Aucun", emoji: "❌", value: "aucun" },
    ],
  },
  {
    id: "has_employees",
    title: "Tu as des employés ?",
    condition: (a) => a.profile_type === "entrepreneur",
    options: [
      { label: "Non", emoji: "👤", value: "non" },
      { label: "1-2", emoji: "👥", value: "1-2" },
      { label: "3-5", emoji: "👥", value: "3-5" },
      { label: "6-10", emoji: "👥", value: "6-10" },
      { label: "Plus de 10", emoji: "🏢", value: "10+" },
    ],
  },
  {
    id: "business_age",
    title: "Ton business tourne depuis ?",
    condition: (a) => a.profile_type === "entrepreneur",
    options: [
      { label: "Moins d'1 an", emoji: "🌱", value: "<1an" },
      { label: "1-3 ans", emoji: "📈", value: "1-3ans" },
      { label: "Plus de 3 ans", emoji: "🏆", value: "3ans+" },
    ],
  },
  {
    id: "children_schooled",
    title: "Les enfants sont scolarisés ?",
    condition: (a) => a.profile_type === "parent" && ["3-4", "5-6", "6+"].includes(a.dependents_count || ""),
    options: [
      { label: "Tous", emoji: "✅", value: "tous" },
      { label: "Certains", emoji: "⚠️", value: "certains" },
      { label: "Non", emoji: "❌", value: "non" },
    ],
  },
  {
    id: "beauty_budget_range",
    title: "Tu alloues combien à ta beauté/vêtements par mois ?",
    condition: (a) => a.gender === "femme",
    options: [
      { label: "Moins de 10 000 F", emoji: "💚", value: "<10k" },
      { label: "10 000 - 30 000 F", emoji: "💛", value: "10-30k" },
      { label: "30 000 - 75 000 F", emoji: "🟠", value: "30-75k" },
      { label: "Plus de 75 000 F", emoji: "💜", value: "75k+" },
    ],
  },
  {
    id: "financial_goal",
    title: "Ton objectif principal avec Mon Jeton ?",
    options: [
      { label: "Épargner plus", emoji: "💰", value: "épargner" },
      { label: "Rembourser des dettes", emoji: "💳", value: "dettes" },
      { label: "Comprendre où va mon argent", emoji: "📊", value: "comprendre" },
      { label: "Investir", emoji: "🚀", value: "investir" },
      { label: "Équilibrer mes dépenses", emoji: "⚖️", value: "équilibrer" },
    ],
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [shouldSave, setShouldSave] = useState(false);

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
      const profileUpdate: Record<string, any> = {
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

      toast({ title: "Bienvenue sur Mon Jeton ! 🎉" });
      navigate("/dashboard", { replace: true });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-6 pt-6 pb-2">
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
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-5 overflow-hidden py-4">
        <div className="w-full max-w-md bg-background/60 backdrop-blur-md rounded-3xl p-5 shadow-xl border border-border/30">
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
                      <span className="text-lg flex-shrink-0">{opt.emoji}</span>
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
        </div>
      </div>

      {/* Bottom button */}
      <div className="relative z-10 px-6 pb-8">
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
      </div>
    </div>
  );
};

export default Onboarding;
