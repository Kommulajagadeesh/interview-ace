import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Video, BarChart2, BookOpen, Settings, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { clearUserAuth, getCurrentUserEmail, getSelfieKey } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(getSelfieKey());
        if (!raw) return setSelfieUrl(null);
        const parsed = JSON.parse(raw);
        setSelfieUrl(parsed?.imageUrl ?? null);
      } catch {
        setSelfieUrl(null);
      }
    };

    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === getSelfieKey() || e.key === "smartInterviewCurrentUserEmail") {
        read();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    clearUserAuth();
    navigate("/login");
  };

  const navItems = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/interview", label: "Mock Interview", icon: Video },
    { to: "/dashboard", label: "Dashboard", icon: BarChart2 },
    { to: "/learning", label: "Learning", icon: BookOpen },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-border/50 bg-card flex flex-col z-40">
      {/* Logo Area */}
      <div className="p-6">
        <Link to="/home" className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Smart Interview AI Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-border/50 shrink-0" />
          <span className="text-lg font-bold tracking-tight text-gradient leading-tight">Smart Interview AI</span>
        </Link>
      </div>

      <div className="px-4 py-2 border-b border-border/50">
         <div className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider px-2">Navigation</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/50 space-y-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium text-muted-foreground">Theme</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Profile */}
        <div className="bg-secondary/30 rounded-xl p-3 border border-border/50">
          <div 
            className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-secondary/50 p-1.5 rounded-lg transition-colors group"
            onClick={() => navigate("/profile-setup")}
            title="Click to view or edit your profile"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
              {selfieUrl ? (
                <img src={selfieUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getCurrentUserEmail()?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {getCurrentUserEmail() || "User"}
              </p>
              <p className="text-xs text-primary underline mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                Edit Profile
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleLogout}>
            <LogOut className="w-3 h-3 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
