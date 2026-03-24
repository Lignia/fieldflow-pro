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
import ProjectDetail from "./pages/ProjectDetail";
import Planning from "./pages/Planning";
import Quotes from "./pages/Quotes";
import CreateQuote from "./pages/CreateQuote";
import QuoteCreate from "./pages/quotes/QuoteCreate";
import QuoteDetail from "./pages/QuoteDetail";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/new" element={<CreateQuote />} />
              <Route path="/projects/:projectId/quotes/new" element={<QuoteCreate />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/service-requests" element={<ServiceRequests />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
