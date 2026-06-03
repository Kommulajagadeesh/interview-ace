import React, { useEffect, useState } from "react";
import { getSelfieKey } from "@/lib/auth";

const IdentityBadge: React.FC = () => {
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

  if (!selfieUrl) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => {
          try {
            window.location.href = "/profile-setup";
          } catch {
            /* noop */
          }
        }}
        title="Enrolled identity — click to open profile setup"
        className="w-12 h-12 rounded-full overflow-hidden border-2 border-black/10 shadow-sm bg-white"
      >
        <img src={selfieUrl} alt="Enrolled selfie" className="w-full h-full object-cover" />
      </button>
    </div>
  );
};

export default IdentityBadge;
