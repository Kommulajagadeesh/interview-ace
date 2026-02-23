import { Link, useLocation } from "react-router-dom";
import { Brain, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/interview", label: "Start Interview" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:border-primary/60 transition-colors">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-gradient">InterviewAI</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button
                variant="ghost"
                className={
                  location.pathname === link.to
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {link.label}
              </Button>
            </Link>
          ))}
          <Link to="/interview" className="ml-2">
            <Button variant="hero" size="sm">Get Started</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-border/50 px-6 py-4 space-y-2">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">{link.label}</Button>
            </Link>
          ))}
          <Link to="/interview" onClick={() => setIsOpen(false)}>
            <Button variant="hero" className="w-full mt-2">Get Started</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
