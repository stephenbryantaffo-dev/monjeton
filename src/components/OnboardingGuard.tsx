import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const OnboardingGuard = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (user && !profile) return null;

  let justCompleted = false;
  try { justCompleted = sessionStorage.getItem("onboarding_just_completed") === "1"; } catch {}
  if (justCompleted && location.pathname !== "/onboarding") {
    try { sessionStorage.removeItem("onboarding_just_completed"); } catch {}
    return <>{children}</>;
  }

  if (
    user &&
    profile &&
    (profile.onboarding_completed === false || profile.onboarding_completed === null || profile.onboarding_completed === undefined) &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;