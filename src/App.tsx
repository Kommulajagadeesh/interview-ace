import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Interview from "./pages/Interview";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import ProfileSetup from "./pages/ProfileSetup";
import Results from "./pages/Results";
import ExamArea from "./pages/ExamArea";
import Inter from "./pages/Inter";
import { isUserLoggedIn, isProfileSetupComplete, isAdminLoggedIn } from "./lib/auth";

const queryClient = new QueryClient();

const RequireUserAuth = () => {
  if (!isUserLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (!isProfileSetupComplete()) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <Outlet />;
};

const RequireAdminAuth = () => {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

import { ThemeProvider } from "@/components/ThemeProvider";

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />

            {/* Standalone User Routes without Left Sidebar */}
            <Route element={<RequireUserAuth />}>
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/inter" element={<Inter />} />
              <Route path="/results" element={<Results />} />
              <Route path="/exam-area" element={<ExamArea />} />
            </Route>

            <Route element={<RequireAdminAuth />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
