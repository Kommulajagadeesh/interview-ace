import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { setUserLoggedIn, setCurrentUserEmail, saveUserProfile, registerUserLogin } from "@/lib/auth";

export interface StudentProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  rollNo?: string;
  collegeName?: string;
  btechYear?: string;
  resumeUrl?: string;
  resumeScore?: number | null;
}

export const SSO_SESSION_KEY = "interview_sso_session";

/**
 * Retrieves the currently active SSO session from browser storage if present.
 */
export const getSSOSession = (): StudentProfile | null => {
  try {
    const storedSession = sessionStorage.getItem(SSO_SESSION_KEY);
    if (storedSession) {
      return JSON.parse(storedSession);
    }
  } catch (e) {
    sessionStorage.removeItem(SSO_SESSION_KEY);
  }
  return null;
};

/**
 * Handles Single Sign-On (SSO) handshake verification using short-lived sso_token in Firestore.
 * 
 * Protocol:
 * 1. Checks if session already exists in sessionStorage
 * 2. Queries Firestore "sso_tokens" collection for ssoToken document
 * 3. Verifies token existence and expiresAt expiration (5-minute window)
 * 4. Extracts student profile details
 * 5. Immediately deletes the token document to enforce one-time use and prevent replay attacks
 * 6. Persists session in sessionStorage and updates local user auth state
 * 7. Logs SSO authentication activity to Firestore "partner_activities" collection
 */
export const handleSSOHandshake = async (
  ssoToken: string
): Promise<{ success: boolean; profile?: StudentProfile; error?: string }> => {
  if (!ssoToken || !ssoToken.trim()) {
    return { success: false, error: "Unauthorized access. Please open the Interview Portal from the LearnLoop core platform." };
  }

  try {
    // Step C: Query Firestore for the token document
    const tokenDocRef = doc(db, "sso_tokens", ssoToken.trim());
    const tokenSnap = await getDoc(tokenDocRef);

    if (!tokenSnap.exists()) {
      return { success: false, error: "Invalid or expired SSO token. Please re-authenticate from LearnLoop." };
    }

    const tokenData = tokenSnap.data();
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);

    // Step D: Verify token expiration (5-minute limit)
    if (now > expiresAt) {
      await deleteDoc(tokenDocRef).catch(() => {}); // Clean up expired token
      return { success: false, error: "SSO token has expired (5-minute limit exceeded). Please try again." };
    }

    // Step E: Extract student profile data
    const studentProfile: StudentProfile = {
      uid: tokenData.uid || "",
      fullName: tokenData.fullName || "",
      email: tokenData.email || "",
      phone: tokenData.phone || "",
      rollNo: tokenData.rollNo || "",
      collegeName: tokenData.collegeName || "",
      btechYear: tokenData.btechYear || "",
      resumeUrl: tokenData.resumeUrl || "",
      resumeScore: tokenData.resumeScore !== undefined ? tokenData.resumeScore : null,
    };

    // Step F: One-Time Use Restriction - Immediately delete token from DB
    await deleteDoc(tokenDocRef);

    // Step G: Save to local state and session storage
    sessionStorage.setItem(SSO_SESSION_KEY, JSON.stringify(studentProfile));

    // Update app authentication and user profile state
    setUserLoggedIn(true);
    if (studentProfile.email) {
      setCurrentUserEmail(studentProfile.email);
      void registerUserLogin(studentProfile.email);
      void saveUserProfile({
        name: studentProfile.fullName,
        email: studentProfile.email,
        gender: "",
        learningPrograms: [studentProfile.collegeName, studentProfile.btechYear].filter(Boolean) as string[],
        intakeAnswers: {
          rollNo: studentProfile.rollNo || "",
          phone: studentProfile.phone || "",
          collegeName: studentProfile.collegeName || "",
          btechYear: studentProfile.btechYear || ""
        },
        resumeFileName: studentProfile.resumeUrl ? "LearnLoop_Resume.pdf" : "",
        resumeText: studentProfile.resumeScore !== null && studentProfile.resumeScore !== undefined ? `Resume Score: ${studentProfile.resumeScore}` : ""
      });
    }

    // Step I: Log Authentication Activity back to Firestore
    await addDoc(collection(db, "partner_activities"), {
      uid: studentProfile.uid,
      userFullName: studentProfile.fullName,
      userEmail: studentProfile.email,
      app: "Interview Portal",
      action: "Authenticated via SSO",
      details: `Logged in using SSO handshake. Roll Number: ${studentProfile.rollNo || "N/A"}.`,
      timestamp: new Date().toISOString()
    });

    return { success: true, profile: studentProfile };
  } catch (err) {
    console.error("SSO verification error:", err);
    return { success: false, error: "An error occurred during secure authentication." };
  }
};

/**
 * Logs user achievements or submissions back to the shared activities stream in Firestore.
 */
export const logInterviewActivity = async (
  studentProfile: Partial<StudentProfile> & { name?: string; fullName?: string; email?: string },
  action: string,
  details: string
) => {
  try {
    const uid = studentProfile.uid || "";
    const userFullName = studentProfile.fullName || studentProfile.name || "Student";
    const userEmail = studentProfile.email || "";

    await addDoc(collection(db, "partner_activities"), {
      uid,
      userFullName,
      userEmail,
      app: "Interview Portal",
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
