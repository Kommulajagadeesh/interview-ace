import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { isUserLoggedIn, isProfileSetupComplete } from "@/lib/auth";

export const SidebarLayout = () => {
  if (!isUserLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (!isProfileSetupComplete()) {
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen relative overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
