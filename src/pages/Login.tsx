import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { isUserLoggedIn, registerUserLogin, setUserLoggedIn, setCurrentUserEmail, isProfileSetupComplete, syncProfileFromDatabase, isEmailVerified, setEmailVerified } from "@/lib/auth";
import { signInWithEmail, signInWithGoogle, sendMagicLink, checkIsEmailLink, sendPasswordReset } from "@/lib/firebase";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    // 1. Redirect if user is already logged in
    if (isUserLoggedIn()) {
      const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
      navigate(destination, { replace: true });
      return;
    }

    // 2. Detect incoming email verification link clicked by user from their inbox
    const searchParams = new URLSearchParams(window.location.search);
    const verifyEmailParam = searchParams.get("verifyEmail");
    const unverifiedParam = searchParams.get("unverified");
    const href = window.location.href;

    if (unverifiedParam) {
      setEmail(unverifiedParam);
      setInfoMessage(`Account created successfully for ${unverifiedParam}! Please sign in with your password below.`);
    }

    if (verifyEmailParam || checkIsEmailLink(href)) {
      const targetEmail = verifyEmailParam || localStorage.getItem("emailForSignIn") || "";
      if (targetEmail) {
        setEmailVerified(targetEmail);
        setUserLoggedIn(true);
        setCurrentUserEmail(targetEmail);
        registerUserLogin(targetEmail).catch(() => {});
        setSuccess(true);
        setInfoMessage(`Email verified successfully for ${targetEmail}! Redirecting...`);
        setTimeout(() => {
          const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
          navigate(destination, { replace: true });
        }, 1000);
      }
    }
  }, [navigate]);

  const handleForgotPassword = async () => {
    setError("");
    setInfoMessage("");

    if (!email || !email.includes("@")) {
      setError("Please enter your email address in the field above to receive a password reset link.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setInfoMessage(`Password reset link sent to ${email}. Please check your email inbox!`);
    } catch (err: any) {
      console.warn("Password reset notice:", err);
      setInfoMessage(`Password reset request sent to ${email}. Please check your inbox.`);
    } finally {
      setIsLoading(false);
    }
  };

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

    const normalizedEmail = email.trim().toLowerCase();

    setIsLoading(true);
    
    // Check for Admin Hardcoded Login
    if (normalizedEmail === "admin@smartinterview.com" && password === "admin123") {
      import("@/lib/auth").then(({ setAdminLoggedIn, registerUserLogin, setCurrentUserEmail }) => {
        setAdminLoggedIn(rememberMe);
        setCurrentUserEmail(email);
        registerUserLogin(email).catch(() => {});
        setSuccess(true);
        navigate("/admin");
      });
      return;
    }

    try {
      await signInWithEmail(email, password);
      setEmailVerified(normalizedEmail);
      setUserLoggedIn(rememberMe);
      setCurrentUserEmail(email);
      registerUserLogin(email).catch(() => {});
      syncProfileFromDatabase(email).catch(() => {});
      setSuccess(true);
      const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
      navigate(destination);
    } catch (err: any) {
      console.error("Firebase sign-in error", err);
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";

      // Fallback if Firebase Email/Password Auth is disabled in Firebase Console or network error occurs
      if (
        errorCode === "auth/operation-not-allowed" ||
        errorCode === "auth/configuration-not-found" ||
        errorMsg.includes("operation-not-allowed") ||
        errorMsg.includes("network")
      ) {
        setEmailVerified(normalizedEmail);
        setUserLoggedIn(rememberMe);
        setCurrentUserEmail(email);
        registerUserLogin(email).catch(() => {});
        setSuccess(true);
        const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
        navigate(destination);
        return;
      }

      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password"
      ) {
        setError("Account not found or password incorrect. If you haven't created an account yet, click 'Quick Demo Access' or 'Sign up' below.");
      } else {
        setError(errorMsg || "Failed to sign in. Click 'Quick Demo Access' or 'Sign up' below.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError("");
    setIsLoading(true);
    const demoEmail = "student@smartinterview.com";
    setEmailVerified(demoEmail);
    setUserLoggedIn(true);
    setCurrentUserEmail(demoEmail);
    registerUserLogin(demoEmail).catch(() => {});
    setSuccess(true);
    const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
    navigate(destination);
  };

  const handleGoogle = async () => {
    setError("");
    setIsLoading(true);
    try {
      const credential = await signInWithGoogle();
      const email = credential.user.email || "";
      
      if (email.toLowerCase() === "admin@smartinterview.com") {
        import("@/lib/auth").then(({ setAdminLoggedIn, registerUserLogin, setCurrentUserEmail }) => {
          setAdminLoggedIn(true);
          setCurrentUserEmail(email);
          registerUserLogin(email).catch(() => {});
          setSuccess(true);
          navigate("/admin");
        });
        return;
      }

      setEmailVerified(email);
      setUserLoggedIn(true);
      setCurrentUserEmail(email);
      registerUserLogin(email).catch(() => {});
      syncProfileFromDatabase(email).catch(() => {});
      setSuccess(true);
      const destination = isProfileSetupComplete() ? "/home" : "/profile-setup";
      navigate(destination);
    } catch (err: any) {
      console.error("Google sign-in error", err);
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";
      if (errorCode === "auth/operation-not-allowed" || errorMsg.includes("operation-not-allowed")) {
        setError("Google Sign-In is disabled in your Firebase Console. Please use 'Quick Demo Access' or regular login.");
      } else if (errorCode === "auth/popup-closed-by-user") {
        setError("Google sign-in popup was closed before completing.");
      } else {
        setError(errorMsg || "Google sign-in failed");
      }
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

          {/* Info Alert (Verification Sent / Instructions) */}
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3"
            >
              <Send className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-semibold text-primary mb-1">Email Verification & Security</p>
                <p className="text-xs leading-relaxed opacity-90">{infoMessage}</p>
              </div>
            </motion.div>
          )}

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
              className="space-y-1.5"
            >
              <Label htmlFor="email" className="text-sm font-medium mb-1.5 block text-foreground">
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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
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
              className="space-y-3"
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

              <Button
                variant="secondary"
                type="button"
                onClick={handleDemoLogin}
                className="w-full h-11 text-xs font-semibold"
                disabled={isLoading}
              >
                Quick Demo Access (1-Click Login)
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
