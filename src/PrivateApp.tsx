import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivacyProvider, usePrivacy } from "@/contexts/PrivacyContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import OnboardingGuard from "@/components/OnboardingGuard";
import PinLockScreen from "@/components/PinLockScreen";
import CurrencyRateLoader from "@/components/CurrencyRateLoader";
import NotFound from "./pages/NotFound";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const Parametres = lazy(() => import("./pages/Parametres"));
const Admin = lazy(() => import("./pages/Admin"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Tontine = lazy(() => import("./pages/Tontine"));
const Scan = lazy(() => import("./pages/Scan"));
const Install = lazy(() => import("./pages/Install"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BRVMSimulator = lazy(() => import("./pages/BRVMSimulator"));
const Receipts = lazy(() => import("./pages/Receipts"));
const PaymentPending = lazy(() => import("./pages/PaymentPending"));
const SubscriptionManage = lazy(() => import("./pages/SubscriptionManage"));
const RejoindreCaisse = lazy(() => import("./pages/RejoindreCaisse"));
const ActivatePro = lazy(() => import("./pages/ActivatePro"));

const PageLoader = () => (
  <div className="min-h-screen gradient-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const InnerRoutes = () => {
  const { isLocked } = usePrivacy();
  const { user } = useAuth();
  if (isLocked && user) return <PinLockScreen />;

  return (
    <Suspense fallback={<PageLoader />}>
      <CurrencyRateLoader />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/install" element={<Install />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/payment-pending" element={<PaymentPending />} />
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
        <Route path="/parametres" element={<ProtectedRoute><OnboardingGuard><Parametres /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/settings/subscription" element={<ProtectedRoute><OnboardingGuard><SubscriptionManage /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/budgets" element={<ProtectedRoute><OnboardingGuard><Budgets /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/tontine" element={<ProtectedRoute><OnboardingGuard><Tontine /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><OnboardingGuard><Scan /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/brvm" element={<ProtectedRoute><OnboardingGuard><BRVMSimulator /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute><OnboardingGuard><Receipts /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/rejoindre-caisse/:token" element={<RejoindreCaisse />} />
        <Route path="/activer" element={<ActivatePro />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const PrivateApp = () => (
  <AuthProvider>
    <PrivacyProvider>
      <InnerRoutes />
    </PrivacyProvider>
  </AuthProvider>
);

export default PrivateApp;
