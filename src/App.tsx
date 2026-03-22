import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthGate } from "./components/auth/AuthGate";
import LandingPage from "./pages/LandingPage";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import Planning from "./pages/Planning";
import Quotes from "./pages/Quotes";
import Invoices from "./pages/Invoices";
import ServiceRequests from "./pages/ServiceRequests";
import NotFound from "./pages/NotFound";
import IconShowcase from "./pages/IconShowcase";
import DesignSystem from "./pages/DesignSystem";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import OnboardingCompanyPage from "./pages/onboarding/OnboardingCompanyPage";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const queryClient = new QueryClient();

function RememberMeGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = () => {
      if (sessionStorage.getItem("lignia_remember_me") === "ephemeral") {
        supabase.auth.signOut();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RememberMeGuard>
          <AuthGate>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/icons" element={<IconShowcase />} />
              <Route path="/design-system" element={<DesignSystem />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/onboarding/company" element={<OnboardingCompanyPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/service-requests" element={<ServiceRequests />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGate>
        </RememberMeGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
