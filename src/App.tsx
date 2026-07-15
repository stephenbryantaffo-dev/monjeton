import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CountryProvider } from "@/contexts/CountryContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Landing eager for instant first paint on "/"
import Landing from "./pages/Landing";

// Everything that touches Supabase / auth is behind this split
const PrivateApp = lazy(() => import("./PrivateApp"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));

const PageLoader = () => (
  <div className="min-h-screen gradient-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CountryProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/privacy"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PrivacyPolicy />
                  </Suspense>
                }
              />
              <Route
                path="/terms"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Terms />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PrivateApp />
                  </Suspense>
                }
              />
            </Routes>
          </CountryProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
