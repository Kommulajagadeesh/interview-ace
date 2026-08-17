import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { handleSSOHandshake, getSSOSession } from "@/lib/sso";
import { toast } from "sonner";
import { isUserLoggedIn, setUserLoggedIn, setCurrentUserEmail } from "@/lib/auth";

export const SSOHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const processSSO = async () => {
      // Step A: Check if a valid session already exists in browser storage
      const existingSession = getSSOSession();
      if (existingSession) {
        if (!isUserLoggedIn()) {
          setUserLoggedIn(true);
          if (existingSession.email) {
            setCurrentUserEmail(existingSession.email);
          }
        }
      }

      // Step B: Check for sso_token in the URL query string
      const ssoToken = searchParams.get("sso_token");
      if (!ssoToken) {
        return;
      }

      setIsVerifying(true);
      const toastId = toast.loading("Establishing secure SSO handshake with LearnLoop...");

      try {
        const result = await handleSSOHandshake(ssoToken);

        // Step H: Clean URL by removing the sso_token from query parameters
        searchParams.delete("sso_token");
        setSearchParams(searchParams, { replace: true });

        toast.dismiss(toastId);

        if (result.success && result.profile) {
          toast.success(`Welcome, ${result.profile.fullName || "Student"}! Authenticated via LearnLoop SSO.`);
          navigate("/dashboard", { replace: true });
        } else {
          toast.error(`Access Denied: ${result.error || "Invalid token"}`);
        }
      } catch (err) {
        toast.dismiss(toastId);
        console.error("Error in SSO processing:", err);
        toast.error("An error occurred during secure authentication.");
      } finally {
        setIsVerifying(false);
      }
    };

    processSSO();
  }, [searchParams, setSearchParams, navigate]);

  if (isVerifying) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 text-white backdrop-blur-md font-['Geist',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center animate-bounce shadow-lg shadow-primary/30 mb-4">
          <span className="material-symbols-outlined text-[28px] text-white">lock</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Establishing Secure Connection</h2>
        <p className="text-sm text-slate-300">Verifying LearnLoop Single Sign-On token...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default SSOHandler;
