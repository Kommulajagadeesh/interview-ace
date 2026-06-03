import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { isUserLoggedIn, registerUserLogin, setUserLoggedIn, setCurrentUserEmail, isProfileSetupComplete, syncProfileFromDatabase } from "@/lib/auth";
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isUserLoggedIn()) {
      const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
      navigate(destination, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setIsLoading(true);
    
    // Check for Admin Hardcoded Login
    if (email.trim().toLowerCase() === "admin@smartinterview.com" && password === "admin123") {
      import("@/lib/auth").then(async ({ setAdminLoggedIn, registerUserLogin, setCurrentUserEmail }) => {
        setAdminLoggedIn(rememberMe);
        setCurrentUserEmail(email);
        await registerUserLogin(email);
        setSuccess(true);
        setTimeout(() => navigate("/admin"), 800);
      });
      return;
    }

    try {
      await signInWithEmail(email, password);
      setUserLoggedIn(rememberMe);
      setCurrentUserEmail(email);
      await registerUserLogin(email);
      await syncProfileFromDatabase(email);
      setSuccess(true);
      const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
      setTimeout(() => navigate(destination), 800);
    } catch (err) {
      console.error("Firebase sign-in error", err);
      const errorObject = err as Error;
      setError(errorObject?.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setIsLoading(true);
    try {
      const credential = await signInWithGoogle();
      const email = credential.user.email || "";
      
      if (email.toLowerCase() === "admin@smartinterview.com") {
        import("@/lib/auth").then(async ({ setAdminLoggedIn, registerUserLogin, setCurrentUserEmail }) => {
          setAdminLoggedIn(true);
          setCurrentUserEmail(email);
          await registerUserLogin(email);
          setSuccess(true);
          setTimeout(() => navigate("/admin"), 800);
        });
        return;
      }

      setUserLoggedIn(true);
      setCurrentUserEmail(email);
      await registerUserLogin(email);
      await syncProfileFromDatabase(email);
      setSuccess(true);
      const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
      setTimeout(() => navigate(destination), 800);
    } catch (err) {
      console.error("Google sign-in error", err);
      const errorObject = err as Error;
      setError(errorObject?.message || "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-full overflow-hidden pointer-events-none flex justify-center">
        <div className="absolute top-[-20%] w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 dark:opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md px-4 sm:px-6 relative z-10"
      >
        <div className="glass-card p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <div className="flex flex-col items-center mb-4">
                <img src="/logo.jpg" alt="Smart Interview AI Logo" className="w-16 h-16 rounded-xl object-cover shadow-md border border-border/50 mb-3" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-foreground">Smart Interview AI</h1>
              <p className="text-muted-foreground font-medium">Sign in to your account</p>
            </motion.div>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </motion.div>
          )}

          {/* Success Alert */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-success/10 border border-success/20 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <p className="text-sm text-success font-medium">Login successful! Redirecting...</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="email" className="text-sm font-medium mb-2 block text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Label htmlFor="password" className="text-sm font-medium mb-2 block text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Remember Me & Forgot Password */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4 rounded border border-border/50 bg-background group-hover:border-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  {rememberMe && <CheckCircle className="w-3 h-3 text-primary" />}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </a>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Button
                type="submit"
                className="w-full font-medium h-12"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </motion.div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                variant="outline" 
                type="button"
                onClick={handleGoogle} 
                className="w-full bg-background border-border hover:bg-background/80 h-12 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
            </motion.div>
          </form>

          {/* Sign Up Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground font-medium">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center text-xs text-muted-foreground font-medium"
        >
          <p>
            By signing in, you agree to our{" "}
            <a href="#" className="hover:text-foreground transition-colors underline underline-offset-2">Terms</a>
            {" "}and{" "}
            <a href="#" className="hover:text-foreground transition-colors underline underline-offset-2">Privacy Policy</a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
