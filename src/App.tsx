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
import ClientDetail from "./pages/clients/ClientDetail";
import ClientCreate from "./pages/clients/ClientCreate";
import ClientEdit from "./pages/clients/ClientEdit";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Planning from "./pages/Planning";
import Quotes from "./pages/Quotes";
import CreateQuote from "./pages/CreateQuote";
import QuoteCreate from "./pages/quotes/QuoteCreate";
import QuoteEditor from "./pages/quotes/QuoteEditor";
import QuoteDetail from "./pages/QuoteDetail";
import Invoices from "./pages/Invoices";
import ServiceRequests from "./pages/ServiceRequests";
import Catalog from "./pages/Catalog";
import NotFound from "./pages/NotFound";
import IconShowcase from "./pages/IconShowcase";
import DesignSystem from "./pages/DesignSystem";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import OnboardingCompanyPage from "./pages/onboarding/OnboardingCompanyPage";
import OnboardingProfilePage from "./pages/onboarding/OnboardingProfilePage";
import ProjectCreate from "./pages/projects/ProjectCreate";
import Installations from "./pages/Installations";
import InstallationDetail from "./pages/InstallationDetail";
import Interventions from "./pages/Interventions";
import { PlaceholderPage } from "./components/ui/PlaceholderPage";
import ServiceRequestCreate from "./pages/ServiceRequestCreate";
import ServiceRequestDetail from "./pages/ServiceRequestDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/icons" element={<IconShowcase />} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/onboarding/company" element={<OnboardingCompanyPage />} />
            <Route path="/onboarding/profile" element={<OnboardingProfilePage />} />

            {/* Full-screen quote editor (outside AppLayout) */}
            <Route path="/projects/:projectId/quotes/editor" element={<QuoteEditor />} />

            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Clients */}
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/new" element={<ClientCreate />} />
              <Route path="/clients/:id/edit" element={<ClientEdit />} />
              <Route path="/clients/:id" element={<ClientDetail />} />

              {/* Projects */}
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<ProjectCreate />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:projectId/quotes/new" element={<QuoteEditor />} />

              {/* Technical surveys */}
              <Route path="/technical-surveys/new" element={<PlaceholderPage title="Nouveau relevé technique" backTo="/projects" backLabel="Projets" />} />
              <Route path="/technical-surveys/:id" element={<PlaceholderPage title="Relevé technique" backTo="/projects" backLabel="Projets" />} />

              {/* Quotes */}
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/new" element={<CreateQuote />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />

              {/* Invoices */}
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:id" element={<PlaceholderPage title="Détail facture" backTo="/invoices" backLabel="Factures" />} />

              {/* Service Requests */}
              <Route path="/service-requests" element={<ServiceRequests />} />
              <Route path="/service-requests/new" element={<ServiceRequestCreate />} />
              <Route path="/service-requests/:id" element={<ServiceRequestDetail />} />

              {/* Interventions */}
              <Route path="/interventions" element={<Interventions />} />
              <Route path="/interventions/new" element={<PlaceholderPage title="Nouvelle intervention" backTo="/interventions" backLabel="Interventions" />} />
              <Route path="/interventions/:id" element={<PlaceholderPage title="Détail intervention" backTo="/interventions" backLabel="Interventions" />} />

              {/* Planning */}
              <Route path="/planning" element={<Planning />} />

              {/* Installations */}
              <Route path="/installations" element={<Installations />} />
              <Route path="/installations/new" element={<PlaceholderPage title="Nouvelle installation" backTo="/installations" backLabel="Parc installé" />} />
              <Route path="/installations/:id" element={<InstallationDetail />} />

              {/* Catalog */}
              <Route path="/catalog" element={<Catalog />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
