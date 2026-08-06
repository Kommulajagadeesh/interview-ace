import { db } from "./firebase";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, increment } from "firebase/firestore";
import type { InterviewResult } from "@/data/questions";

export interface SessionData {
  date: string;
  category: string;
  results: InterviewResult[];
  note?: string;
  mcqScore?: number;
  mcqResults?: {
    questionText: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  verificationPhoto?: string;
}

const USER_AUTH_KEY = "smartInterviewLoggedIn";
const ADMIN_AUTH_KEY = "smartInterviewAdminLoggedIn";
const USER_LOGINS_KEY = "smartInterviewUserLogins";

export interface TrackedUserLogin {
  email: string;
  loginCount: number;
  lastLoginAt: string;
}

const readTrackedUsers = (): TrackedUserLogin[] => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(USER_LOGINS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry) =>
      entry && typeof entry.email === "string" && typeof entry.loginCount === "number" && typeof entry.lastLoginAt === "string"
    );
  } catch {
    return [];
  }
};

export const safeSessionStorageSet = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (err) {
    console.warn(`sessionStorage failed for key "${key}":`, err);
    if (value.includes("data:image")) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object") {
          if (parsed.profilePhoto) parsed.profilePhoto = "";
          if (parsed.verificationPhoto) parsed.verificationPhoto = "";
          sessionStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch {
        // Ignore
      }
    }
  }
};

export const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`localStorage failed for key "${key}":`, err);
    if (value.includes("data:image")) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object") {
          if (parsed.profilePhoto) parsed.profilePhoto = "";
          if (parsed.verificationPhoto) parsed.verificationPhoto = "";
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch {
        // Ignore
      }
    }
  }
};

export const isEmailVerified = (email: string): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === "admin@smartinterview.com" || normalized === "student@smartinterview.com") {
    return true;
  }
  return localStorage.getItem(`verifiedEmail_${normalized}`) === "true";
};

export const setEmailVerified = (email: string) => {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  safeLocalStorageSet(`verifiedEmail_${normalized}`, "true");
};

export const isUserLoggedIn = () =>
  sessionStorage.getItem(USER_AUTH_KEY) === "true" ||
  localStorage.getItem(USER_AUTH_KEY) === "true";

export const setUserLoggedIn = (rememberMe: boolean) => {
  if (rememberMe) {
    safeLocalStorageSet(USER_AUTH_KEY, "true");
    safeSessionStorageSet(USER_AUTH_KEY, "true");
    return;
  }

  safeSessionStorageSet(USER_AUTH_KEY, "true");
  localStorage.removeItem(USER_AUTH_KEY);
};

export const CURRENT_USER_EMAIL_KEY = "smartInterviewCurrentUserEmail";

export const setCurrentUserEmail = (email: string) => {
  safeSessionStorageSet(CURRENT_USER_EMAIL_KEY, email);
  safeLocalStorageSet(CURRENT_USER_EMAIL_KEY, email);
};

export const getCurrentUserEmail = () => {
  return sessionStorage.getItem(CURRENT_USER_EMAIL_KEY) || localStorage.getItem(CURRENT_USER_EMAIL_KEY);
};

const clearSensitiveStorage = () => {
  const theme = localStorage.getItem("vite-ui-theme");
  localStorage.clear();
  sessionStorage.clear();
  if (theme) {
    safeLocalStorageSet("vite-ui-theme", theme);
  }
};

export const clearUserAuth = () => {
  clearSensitiveStorage();
};

export const registerUserLogin = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const users = readTrackedUsers();
  const existingIndex = users.findIndex((user) => user.email === normalizedEmail);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existingUser = users[existingIndex];
    users[existingIndex] = {
      ...existingUser,
      loginCount: existingUser.loginCount + 1,
      lastLoginAt: now,
    };
  } else {
    users.push({
      email: normalizedEmail,
      loginCount: 1,
      lastLoginAt: now,
    });
  }

  safeSessionStorageSet(USER_LOGINS_KEY, JSON.stringify(users));

  // Sync to Firestore without blocking
  const docRef = doc(db, "userLogins", normalizedEmail);
  setDoc(docRef, {
    email: normalizedEmail,
    loginCount: increment(1),
    lastLoginAt: now,
  }, { merge: true })
    .then(() => console.log("Login count synced to Firestore for:", normalizedEmail))
    .catch((err) => console.error("Firestore setDoc error (userLogins):", err));
};

export const getTrackedUsers = (): TrackedUserLogin[] => readTrackedUsers();

export const syncTrackedUsersFromDatabase = async (): Promise<TrackedUserLogin[]> => {
  try {
    const colRef = collection(db, "userLogins");
    const snap = await getDocs(colRef);
    const list: TrackedUserLogin[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.email && typeof data.loginCount === "number" && data.lastLoginAt) {
        list.push({
          email: data.email,
          loginCount: data.loginCount,
          lastLoginAt: data.lastLoginAt,
        });
      }
    });

    if (list.length > 0) {
      safeSessionStorageSet(USER_LOGINS_KEY, JSON.stringify(list));
    }
    return list;
  } catch (err) {
    console.error("Failed to sync tracked users from Firestore:", err);
  }
  return getTrackedUsers();
};

export interface AdminUserDetail {
  email: string;
  name: string;
  gender: string;
  learningPrograms: string[];
  intakeAnswers: Record<string, string>;
  resumeFileName?: string;
  resumeText?: string;
  profilePhoto?: string;
  loginCount: number;
  lastLoginAt: string;
  isAdmin: boolean;
}

export const syncAllUsersAndAdmins = async (): Promise<AdminUserDetail[]> => {
  try {
    // 1. Fetch all profiles
    const profilesCol = collection(db, "userProfiles");
    const profilesSnap = await getDocs(profilesCol);
    const profilesMap: Record<string, UserProfile> = {};
    profilesSnap.forEach((doc) => {
      const data = doc.data() as UserProfile;
      if (data.email) {
        profilesMap[data.email.trim().toLowerCase()] = data;
      }
    });

    // 2. Fetch all logins
    const loginsCol = collection(db, "userLogins");
    const loginsSnap = await getDocs(loginsCol);
    const loginsMap: Record<string, TrackedUserLogin> = {};
    loginsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.email) {
        loginsMap[data.email.trim().toLowerCase()] = {
          email: data.email,
          loginCount: data.loginCount || 0,
          lastLoginAt: data.lastLoginAt || "",
        };
      }
    });

    // 3. Merge all unique emails
    const allEmails = new Set([
      ...Object.keys(profilesMap),
      ...Object.keys(loginsMap),
      "admin@smartinterview.com", // Ensure primary admin is always included
    ]);

    const list: AdminUserDetail[] = [];
    allEmails.forEach((email) => {
      const profile = profilesMap[email];
      const login = loginsMap[email];
      const isAdmin = email === "admin@smartinterview.com" || email.includes("admin");

      list.push({
        email,
        name: profile?.name || (isAdmin ? "System Administrator" : ""),
        gender: profile?.gender || "",
        learningPrograms: profile?.learningPrograms || [],
        intakeAnswers: profile?.intakeAnswers || {},
        resumeFileName: profile?.resumeFileName || "",
        resumeText: profile?.resumeText || "",
        profilePhoto: profile?.profilePhoto || "",
        loginCount: login?.loginCount || (email === "admin@smartinterview.com" ? 1 : 0),
        lastLoginAt: login?.lastLoginAt || (email === "admin@smartinterview.com" ? new Date().toISOString() : ""),
        isAdmin,
      });
    });

    return list;
  } catch (err) {
    console.error("Failed to sync all users and admins:", err);
    return [];
  }
};

export const isAdminLoggedIn = () =>
  localStorage.getItem(ADMIN_AUTH_KEY) === "true" ||
  sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";

export const setAdminLoggedIn = (rememberMe: boolean) => {
  if (rememberMe) {
    safeLocalStorageSet(ADMIN_AUTH_KEY, "true");
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    return;
  }

  safeSessionStorageSet(ADMIN_AUTH_KEY, "true");
  localStorage.removeItem(ADMIN_AUTH_KEY);
};

export const clearAdminAuth = () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
};

export interface UserProfile {
  name: string;
  email: string;
  gender: string;
  learningPrograms: string[];
  intakeAnswers: Record<string, string>;
  resumeFileName?: string;
  resumeText?: string;
  profilePhoto?: string;
}

export const getProfileCompleteKey = () => {
  const email = getCurrentUserEmail() || "default";
  return `smartInterviewProfileSetupComplete_${email.trim().toLowerCase()}`;
};

export const getProfileDataKey = () => {
  const email = getCurrentUserEmail() || "default";
  return `smartInterviewUserProfile_${email.trim().toLowerCase()}`;
};

export const isProfileSetupComplete = () => {
  return sessionStorage.getItem(getProfileCompleteKey()) === "true" || localStorage.getItem(getProfileCompleteKey()) === "true";
};

const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        cleaned[key] = sanitizeForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    } else {
      cleaned[key] = "";
    }
  });
  return cleaned as T;
};

export const saveUserProfile = async (profile: UserProfile) => {
  safeSessionStorageSet(getProfileDataKey(), JSON.stringify(profile));
  safeLocalStorageSet(getProfileDataKey(), JSON.stringify(profile));
  safeSessionStorageSet(getProfileCompleteKey(), "true");
  safeLocalStorageSet(getProfileCompleteKey(), "true");

  const email = profile.email || getCurrentUserEmail() || "";
  if (email) {
    const docRef = doc(db, "userProfiles", email.trim().toLowerCase());
    const payload = sanitizeForFirestore({
      ...profile,
      email: email.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    });
    setDoc(docRef, payload, { merge: true })
      .then(() => console.log("Profile successfully saved to Firestore:", email))
      .catch((err) => console.error("Firestore setDoc error (userProfiles):", err));
  }
};

export const saveInitialProfile = async (profile: UserProfile) => {
  safeSessionStorageSet(getProfileDataKey(), JSON.stringify(profile));
  safeLocalStorageSet(getProfileDataKey(), JSON.stringify(profile));
  safeSessionStorageSet(getProfileCompleteKey(), "false");
  safeLocalStorageSet(getProfileCompleteKey(), "false");

  const email = profile.email || getCurrentUserEmail() || "";
  if (email) {
    const docRef = doc(db, "userProfiles", email.trim().toLowerCase());
    const payload = sanitizeForFirestore({
      ...profile,
      email: email.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    });
    setDoc(docRef, payload, { merge: true })
      .then(() => console.log("Initial profile saved to Firestore:", email))
      .catch((err) => console.error("Firestore setDoc error (initial profile):", err));
  }
};

export const getUserProfile = (): UserProfile | null => {
  try {
    const raw = sessionStorage.getItem(getProfileDataKey()) || localStorage.getItem(getProfileDataKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const syncProfileFromDatabase = async (email: string) => {
  if (!email) return null;
  try {
    const docRef = doc(db, "userProfiles", email.trim().toLowerCase());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const dataKey = `smartInterviewUserProfile_${email.trim().toLowerCase()}`;
      const completeKey = `smartInterviewProfileSetupComplete_${email.trim().toLowerCase()}`;
      safeSessionStorageSet(dataKey, JSON.stringify(data));
      safeLocalStorageSet(dataKey, JSON.stringify(data));
      safeSessionStorageSet(completeKey, "true");
      safeLocalStorageSet(completeKey, "true");
      if (data.profilePhoto) {
        safeSessionStorageSet(`interviewSelfie_${email.trim().toLowerCase()}`, data.profilePhoto);
        safeLocalStorageSet(`interviewSelfie_${email.trim().toLowerCase()}`, data.profilePhoto);
      }
      return data;
    }
  } catch (err) {
    console.warn("Failed to sync profile from Firestore:", err);
  }
  return null;
};

export const getInterviewResultsKey = () => {
  const email = getCurrentUserEmail() || "default";
  return `interviewResults_${email.trim().toLowerCase()}`;
};

export const getSelfieKey = () => {
  const email = getCurrentUserEmail() || "default";
  return `interviewSelfie_${email.trim().toLowerCase()}`;
};

export const saveInterviewSession = async (session: SessionData) => {
  const email = getCurrentUserEmail() || "default";
  const resultsKey = getInterviewResultsKey();
  
  let existing: SessionData[] = [];
  try {
    existing = JSON.parse(sessionStorage.getItem(resultsKey) || "[]");
  } catch {
    existing = [];
  }
  
  const updated = [...existing.filter(s => s.date !== session.date), session];
  safeSessionStorageSet(resultsKey, JSON.stringify(updated));

  const docId = `${email.trim().toLowerCase()}_${new Date(session.date).getTime()}`;
  const docRef = doc(db, "interviewSessions", docId);
  const payload = sanitizeForFirestore({
    ...session,
    email: email.trim().toLowerCase(),
  });
  setDoc(docRef, payload)
    .then(() => console.log("Interview session saved to Firestore:", docId))
    .catch((err) => console.error("Firestore setDoc error (interviewSessions):", err));
};

export const syncInterviewSessionsFromDatabase = async (email: string): Promise<SessionData[]> => {
  if (!email) return [];
  try {
    const colRef = collection(db, "interviewSessions");
    const snap = await getDocs(colRef);
    const list: SessionData[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.email === email.trim().toLowerCase()) {
        list.push({
          date: data.date,
          category: data.category,
          results: data.results,
          note: data.note,
          mcqScore: data.mcqScore,
          mcqResults: data.mcqResults,
          verificationPhoto: data.verificationPhoto,
        });
      }
    });

    if (list.length > 0) {
      const sorted = list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      safeSessionStorageSet(`interviewResults_${email.trim().toLowerCase()}`, JSON.stringify(sorted));
      return sorted;
    }
  } catch (err) {
    console.error("Failed to sync sessions from Firestore:", err);
  }
  
  try {
    return JSON.parse(sessionStorage.getItem(`interviewResults_${email.trim().toLowerCase()}`) || "[]");
  } catch {
    return [];
  }
};

export const syncAllSessionsForAdmin = async (): Promise<(SessionData & { storageKey: string })[]> => {
  try {
    const colRef = collection(db, "interviewSessions");
    const snap = await getDocs(colRef);
    const allSessions: (SessionData & { storageKey: string })[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const email = data.email || doc.id.split("_")[0] || "unknown";
      allSessions.push({
        date: data.date,
        category: data.category,
        results: data.results,
        note: data.note,
        mcqScore: data.mcqScore,
        mcqResults: data.mcqResults,
        verificationPhoto: data.verificationPhoto,
        storageKey: `interviewResults_${email.trim().toLowerCase()}`,
      });
    });

    return allSessions;
  } catch (err) {
    console.error("Failed to sync all sessions for admin:", err);
    return [];
  }
};

export const deleteInterviewSession = async (email: string, date: string) => {
  try {
    const docId = `${email.trim().toLowerCase()}_${new Date(date).getTime()}`;
    const docRef = doc(db, "interviewSessions", docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Failed to delete interview session from Firestore:", err);
    throw err;
  }
};

