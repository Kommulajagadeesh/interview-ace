import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import HomeHub from "./pages/HomeHub";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Interview from "./pages/Interview";
import Dashboard from "./pages/Dashboard";
import Learning from "./pages/Learning";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import ProfileSetup from "./pages/ProfileSetup";
import { isAdminLoggedIn } from "./lib/auth";
import { SidebarLayout } from "./components/SidebarLayout";

const queryClient = new QueryClient();

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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />

            <Route element={<SidebarLayout />}>
              <Route path="/home" element={<HomeHub />} />
              <Route path="/learning" element={<Learning />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/dashboard" element={<Dashboard />} />
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
