import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { clearUserAuth, isUserLoggedIn, getCurrentUserEmail } from "@/lib/auth";
import { ModeToggle } from "./ModeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = isUserLoggedIn();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    clearUserAuth();
    setIsOpen(false);
    navigate("/login");
  };

  const links = [
    { to: "/home", label: "Home" },
    { to: "/learning", label: "Learning" },
    { to: "/interview", label: "Start Interview" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass shadow-sm py-2" : "bg-transparent py-4"}`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2 group">
          <img src="/logo.jpg" alt="Smart Interview AI Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm border border-border/50 shrink-0" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-gradient">Smart Interview AI</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button
                variant="ghost"
                size="sm"
                className={`font-medium ${
                  location.pathname === link.to
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
          <div className="w-px h-6 bg-border mx-2" />
          <ModeToggle />
          <div className="w-px h-6 bg-border mx-2" />
          {!isLoggedIn ? (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button variant="default" size="sm" className="font-medium rounded-full px-5">Sign Up</Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
                {getCurrentUserEmail() || "User"}
              </span>
              <Button variant="outline" size="sm" className="font-medium rounded-full px-5" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          )}
          <Link to="/interview">
            <Button variant="hero" size="sm" className="font-medium rounded-full px-5">Get Started</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground p-2 -mr-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass absolute top-full left-0 right-0 border-t border-border/50 p-4 shadow-glass animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-2">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium">{link.label}</Button>
              </Link>
            ))}
            <div className="flex justify-between items-center my-2">
              <span className="text-sm font-medium">Theme</span>
              <ModeToggle />
            </div>
            <div className="h-px bg-border mb-2" />
            {!isLoggedIn ? (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full font-medium">Sign In</Button>
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)}>
                  <Button variant="default" className="w-full font-medium">Sign Up</Button>
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between bg-secondary/30 px-4 py-2 rounded-md mb-2 border border-border/50">
                  <span className="text-sm font-medium text-muted-foreground">Signed in as</span>
                  <span className="text-sm font-bold text-foreground">
                    {getCurrentUserEmail() || "User"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full font-medium"
                  onClick={handleLogout}
                >
                  Log Out
                </Button>
              </>
            )}
            <Link to="/interview" onClick={() => setIsOpen(false)}>
              <Button variant="hero" className="w-full font-medium mt-2">Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
