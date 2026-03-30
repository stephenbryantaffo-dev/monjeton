import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PrivacyProvider, usePrivacy } from "@/contexts/PrivacyContext";
import { CountryProvider } from "@/contexts/CountryContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import OnboardingGuard from "@/components/OnboardingGuard";
import PinLockScreen from "@/components/PinLockScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Eager load critical paths
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Transactions = lazy(() => import("./pages/Transactions"));
const NewTransaction = lazy(() => import("./pages/NewTransaction"));
const Categories = lazy(() => import("./pages/Categories"));
const Wallets = lazy(() => import("./pages/Wallets"));
const Reports = lazy(() => import("./pages/Reports"));
const Savings = lazy(() => import("./pages/Savings"));
const Debts = lazy(() => import("./pages/Debts"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Tontine = lazy(() => import("./pages/Tontine"));
const Scan = lazy(() => import("./pages/Scan"));
const Install = lazy(() => import("./pages/Install"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));

const PageLoader = () => (
  <div className="min-h-screen gradient-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const AppContent = () => {
  const { isLocked } = usePrivacy();
  const { user } = useAuth();

  if (isLocked && user) return <PinLockScreen />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/install" element={<Install />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><OnboardingGuard><Transactions /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/transactions/new" element={<ProtectedRoute><OnboardingGuard><NewTransaction /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><OnboardingGuard><Categories /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/wallets" element={<ProtectedRoute><OnboardingGuard><Wallets /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><OnboardingGuard><Reports /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/savings" element={<ProtectedRoute><OnboardingGuard><Savings /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/debts" element={<ProtectedRoute><OnboardingGuard><Debts /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><OnboardingGuard><Assistant /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><OnboardingGuard><Settings /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/budgets" element={<ProtectedRoute><OnboardingGuard><Budgets /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/tontine" element={<ProtectedRoute><OnboardingGuard><Tontine /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><OnboardingGuard><Scan /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CountryProvider>
            <AuthProvider>
              <PrivacyProvider>
                <AppContent />
              </PrivacyProvider>
            </AuthProvider>
          </CountryProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
