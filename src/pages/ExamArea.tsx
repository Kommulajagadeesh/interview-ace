import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  Shield, 
  User, 
  Settings, 
  Video, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Play, 
  Lock, 
  Unlock, 
  Users, 
  Terminal, 
  ChevronRight, 
  Upload,
  RefreshCw,
  Plus,
  LogOut,
  Camera,
  Code,
  FileText,
  Eye,
  Trophy,
  Download,
  XCircle,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import FaceRecognition from "@/components/FaceRecognition";

// Firebase imports
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  getDocs, 
  query 
} from "firebase/firestore";

// -------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------
interface MCQQuestion {
  text: string;
  options: string[];
  correctOption: number; // Index 0-3
}

interface CodingQuestion {
  text: string;
  initialCode: string;
}

interface StudentRecord {
  name: string;
  email: string;
  currentIndex: number;
  answers: any[];
  warnings: number;
  status: "active" | "locked" | "submitted";
  logs: { timestamp: string; message: string; type: "info" | "warning" | "error" }[];
  photoUrl?: string;
}

interface ExamSession {
  examRoomId: string;
  panelRoomId: string;
  adminPin: string;
  title: string;
  category: string;
  duration: number; // in minutes
  examType: "mcq" | "coding";
  showAnswersAfterExam: boolean; // Setting to show answer keys/corrections to candidates
  questions: (MCQQuestion | CodingQuestion)[];
  students: {
    [email: string]: StudentRecord;
  };
}

const ExamArea = () => {
  const navigate = useNavigate();
  
  // Page Modes: "select" | "create" | "monitor_login" | "monitor_dashboard" | "student_login" | "student_rules" | "student_exam" | "student_submitted"
  const [mode, setMode] = useState<
    "select" | "create" | "monitor_login" | "monitor_dashboard" | "student_login" | "student_rules" | "student_exam" | "student_submitted"
  >("select");

  // Global active session (if loaded)
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);
  
  // Admin selected student for detail modal
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  // Admin active monitor view: "logs" | "registry" | "leaderboard"
  const [adminMonitorTab, setAdminMonitorTab] = useState<"logs" | "registry" | "leaderboard">("logs");

  // -------------------------------------------------------------
  // Form States
  // -------------------------------------------------------------
  // Create Exam Form
  const [examTitle, setExamTitle] = useState("");
  const [examCategory, setExamCategory] = useState("Python");
  const [examType, setExamType] = useState<"mcq" | "coding">("mcq");
  const [examDuration, setExamDuration] = useState(15); // in minutes
  const [questionCount, setQuestionCount] = useState(3);
  const [showAnswersAfterExam, setShowAnswersAfterExam] = useState(true);
  const [pdfTextContext, setPdfTextContext] = useState("");

  // Room Entry Forms
  const [studentRoomId, setStudentRoomId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // Admin Monitor Access Form
  const [adminRoomId, setAdminRoomId] = useState("");
  const [adminPinInput, setAdminPinInput] = useState("");

  // Student Unlock Form (if student gets locked out)
  const [unlockPinInput, setUnlockPinInput] = useState("");

  // -------------------------------------------------------------
  // Active Exam Taking States (Student)
  // -------------------------------------------------------------
  const [currentStudentEmail, setCurrentStudentEmail] = useState("");
  const [studentAnswers, setStudentAnswers] = useState<any[]>([]);
  const [studentWarnings, setStudentWarnings] = useState(0);
  const [studentLogs, setStudentLogs] = useState<any[]>([]);
  const [studentCurrentIndex, setStudentCurrentIndex] = useState(0);
  const [examTimeLeft, setExamTimeLeft] = useState(0); // in seconds
  const [isFaceTrackingActive, setIsFaceTrackingActive] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Derived current student object
  const student = activeSession && currentStudentEmail ? activeSession.students?.[currentStudentEmail] || null : null;

  // Time formatter
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Score Calculator
  const getStudentScore = (studentRec: StudentRecord, session: ExamSession): number => {
    if (!studentRec || !session || !studentRec.answers) return 0;
    if (session.examType === "coding") {
      return studentRec.answers.filter((ans) => typeof ans === "string" && ans.trim().length > 0).length;
    }
    let score = 0;
    session.questions.forEach((q, idx) => {
      const mcq = q as MCQQuestion;
      if (studentRec.answers[idx] === mcq.correctOption) {
        score++;
      }
    });
    return score;
  };

  // Photo Identity Avatar Renderer
  const renderStudentAvatar = (s?: StudentRecord | null, sizeClass: string = "w-8 h-8") => {
    if (!s) return null;
    if (s.photoUrl) {
      return (
        <img 
          src={s.photoUrl} 
          alt={s.name} 
          className={`${sizeClass} rounded-full object-cover border-2 border-primary/40 shadow-sm shrink-0`} 
        />
      );
    }
    const initials = s.name
      ? s.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "ST";
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/30 to-primary/80 text-primary-foreground font-extrabold flex items-center justify-center text-[10px] shadow-sm border border-primary/50 shrink-0`}>
        {initials}
      </div>
    );
  };

  // CSV Exporter for Invigilators
  const downloadLeaderboardCsv = () => {
    if (!activeSession) return;
    const list = getLeaderboardList();
    const headers = ["Rank", "Candidate Name", "Email", "Warnings", "Status", "Score", "Total Questions"];
    const rows = list.map((s, idx) => [
      idx + 1,
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${(s.email || "").replace(/"/g, '""')}"`,
      s.warnings || 0,
      s.status || "active",
      getStudentScore(s, activeSession),
      activeSession.questions.length
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeSession.title.replace(/\s+/g, "_")}_Leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lastCheatWarningTimeRef = useRef<number>(0);

  // Exam timer countdown effect
  useEffect(() => {
    if (mode !== "student_exam" || examTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setExamTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExamAutomatically();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, examTimeLeft]);

  // Strict Anti-Cheat Event Listeners (Tab Switching, Window Focus Loss, Fullscreen Exit)
  useEffect(() => {
    if (mode !== "student_exam") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatWarning("Candidate switched browser tab or minimized window");
      }
    };

    const handleBlur = () => {
      triggerCheatWarning("Candidate window lost focus / clicked outside exam theatre");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerCheatWarning("Candidate exited full-screen mode");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [mode, studentWarnings, activeSession, currentStudentEmail]);

  // Helper to sync local student record updates instantly
  const updateLocalStudentState = (updater: (prevStudent: StudentRecord) => StudentRecord) => {
    if (!activeSession || !currentStudentEmail) return;
    setActiveSession((prev) => {
      if (!prev) return null;
      const currentRec = prev.students?.[currentStudentEmail] || {
        name: studentName || "Candidate",
        email: currentStudentEmail,
        currentIndex: 0,
        answers: [],
        warnings: 0,
        status: "active",
        logs: []
      };
      const updatedRec = updater(currentRec);
      const nextSession = {
        ...prev,
        students: {
          ...(prev.students || {}),
          [currentStudentEmail]: updatedRec
        }
      };

      try {
        const stored = localStorage.getItem("local_exam_sessions");
        const sessions = stored ? JSON.parse(stored) : {};
        sessions[prev.examRoomId] = nextSession;
        localStorage.setItem("local_exam_sessions", JSON.stringify(sessions));
      } catch (e) {
        console.warn("LocalStorage sync warning", e);
      }

      return nextSession;
    });
  };

  // Populate Demo Candidates for live invigilator testing
  const populateDemoCandidates = () => {
    if (!activeSession) return;

    const demoStudents: { [email: string]: StudentRecord } = {
      "jagadeesh@example.com": {
        name: "Jagadeesh Kommula",
        email: "jagadeesh@example.com",
        currentIndex: activeSession.questions.length - 1,
        answers: activeSession.questions.map((q: any) => activeSession.examType === "coding" ? "def solution():\n    return True" : (q.correctOption ?? 0)),
        warnings: 0,
        status: "submitted",
        logs: [
          { timestamp: "09:30:12 AM", message: "Joined exam hall entry portal", type: "info" },
          { timestamp: "09:30:45 AM", message: "AI Face & Webcam Identity Verified", type: "info" },
          { timestamp: "09:42:10 AM", message: "Completed all question submissions cleanly", type: "info" }
        ]
      },
      "priya@example.com": {
        name: "Priya Sharma",
        email: "priya@example.com",
        currentIndex: 1,
        answers: activeSession.questions.map((q: any, i) => activeSession.examType === "coding" ? "def code(): pass" : (i % 2 === 0 ? 0 : 1)),
        warnings: 1,
        status: "active",
        logs: [
          { timestamp: "09:32:00 AM", message: "Joined exam room", type: "info" },
          { timestamp: "09:36:22 AM", message: "Anti-cheat warning: Head posture turned right (Warning 1/3)", type: "warning" }
        ]
      },
      "rahul@example.com": {
        name: "Rahul Verma",
        email: "rahul@example.com",
        currentIndex: 0,
        answers: activeSession.questions.map((q: any) => activeSession.examType === "coding" ? "" : -1),
        warnings: 3,
        status: "locked",
        logs: [
          { timestamp: "09:31:15 AM", message: "Joined exam room", type: "info" },
          { timestamp: "09:34:02 AM", message: "Anti-cheat warning: Switched browser tab (Warning 1/3)", type: "warning" },
          { timestamp: "09:35:10 AM", message: "Anti-cheat warning: Second face detected in frame (Warning 2/3)", type: "warning" },
          { timestamp: "09:37:44 AM", message: "Anti-cheat warning: Exited full screen mode (Warning 3/3)", type: "warning" },
          { timestamp: "09:37:45 AM", message: "Exam session automatically LOCKED by anti-cheat rules", type: "error" }
        ]
      },
      "sneha@example.com": {
        name: "Sneha Patel",
        email: "sneha@example.com",
        currentIndex: 2,
        answers: activeSession.questions.map((q: any) => activeSession.examType === "coding" ? "def solve(): return 42" : 0),
        warnings: 0,
        status: "active",
        logs: [
          { timestamp: "09:33:50 AM", message: "Joined exam room", type: "info" },
          { timestamp: "09:34:10 AM", message: "Full-screen mode active & AI monitoring engaged", type: "info" }
        ]
      }
    };

    const updatedSession = {
      ...activeSession,
      students: {
        ...activeSession.students,
        ...demoStudents
      }
    };

    setActiveSession(updatedSession);

    try {
      const stored = localStorage.getItem("local_exam_sessions");
      const sessions = stored ? JSON.parse(stored) : {};
      sessions[activeSession.examRoomId] = updatedSession;
      localStorage.setItem("local_exam_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.warn("Save demo candidates warning", e);
    }

    toast.success("Populated 4 demo candidates for testing live invigilation!");
  };

  // -------------------------------------------------------------
  // Real-Time Sync via Firebase onSnapshot Listeners
  // -------------------------------------------------------------
  
  // 1. Invigilator Dashboard Listeners (Dual Sync: Firestore + LocalStorage)
  useEffect(() => {
    if (mode === "monitor_dashboard" && activeSession?.examRoomId) {
      const roomId = activeSession.examRoomId;

      // Local storage sync function
      const syncLocalSession = () => {
        try {
          const stored = localStorage.getItem("local_exam_sessions");
          if (stored) {
            const sessions = JSON.parse(stored);
            const localSess = sessions[roomId];
            if (localSess && localSess.students) {
              setActiveSession((prev) => {
                if (!prev) return localSess;
                return {
                  ...prev,
                  title: localSess.title || prev.title,
                  students: {
                    ...prev.students,
                    ...localSess.students
                  }
                };
              });
            }
          }
        } catch (e) {
          console.warn("LocalStorage sync notice", e);
        }
      };

      // Poll every 2s for instant local updates across tabs
      const pollInterval = setInterval(syncLocalSession, 2000);
      window.addEventListener("storage", syncLocalSession);
      syncLocalSession();

      // Firebase Firestore Listeners
      let unsubscribeSession = () => {};
      let unsubscribeStudents = () => {};

      try {
        unsubscribeSession = onSnapshot(doc(db, "examSessions", roomId), (docSnap) => {
          if (docSnap.exists()) {
            const sessionData = docSnap.data() as any;
            setActiveSession((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                title: sessionData.title,
                category: sessionData.category,
                duration: sessionData.duration,
                examType: sessionData.examType,
                showAnswersAfterExam: sessionData.showAnswersAfterExam,
                questions: sessionData.questions
              };
            });
          }
        }, (err) => console.warn("Firestore session snapshot notice", err));

        unsubscribeStudents = onSnapshot(
          collection(db, "examSessions", roomId, "students"),
          (querySnap) => {
            const studentMap: { [email: string]: StudentRecord } = {};
            querySnap.forEach((studentDoc) => {
              studentMap[studentDoc.id] = studentDoc.data() as StudentRecord;
            });
            setActiveSession((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                students: {
                  ...prev.students,
                  ...studentMap
                }
              };
            });
          },
          (err) => console.warn("Firestore students snapshot notice", err)
        );
      } catch (e) {
        console.warn("Firestore listener init skipped", e);
      }

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener("storage", syncLocalSession);
        unsubscribeSession();
        unsubscribeStudents();
      };
    }
  }, [mode, activeSession?.examRoomId]);

  // 2. Student Lockscreen/Status Listener (Handles instant remote unlocking/resets by Examiner)
  useEffect(() => {
    if ((mode === "student_exam" || mode === "student_login" || mode === "student_rules") && activeSession && currentStudentEmail) {
      const roomId = activeSession.examRoomId;
      const email = currentStudentEmail;

      const unsubscribe = onSnapshot(doc(db, "examSessions", roomId, "students", email), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as StudentRecord;
          setStudentWarnings(data.warnings);
          setStudentAnswers(data.answers);
          setStudentLogs(data.logs);
          setStudentCurrentIndex(data.currentIndex);

          // Handle lockout transitions
          if (data.status === "locked" && mode === "student_exam") {
            setMode("student_login");
            document.exitFullscreen().catch(() => {});
            toast.error("Exam Locked! You exceeded 3 warnings. Request invigilator unlock PIN.");
          }

          // Handle remote unlock transitions
          if (data.status === "active" && mode === "student_login" && data.warnings === 0) {
            setMode("student_rules");
            toast.success("Exam unlocked by examiner! You can resume.");
          }
        }
      });

      return () => unsubscribe();
    }
  }, [mode, activeSession?.examRoomId, currentStudentEmail]);

  // -------------------------------------------------------------
  // AI Question Generation helper (utilizing Syllabus / Raw Data text context)
  // -------------------------------------------------------------
  const parseRawQuestions = (text: string): MCQQuestion[] => {
    if (!text.trim()) return [];
    
    const lines = text.split("\n");
    const parsedQuestions: MCQQuestion[] = [];
    let currentText = "";
    let options: string[] = [];
    let correct = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("Q") || trimmed.startsWith("q")) {
        if (currentText && options.length > 0) {
          parsedQuestions.push({ text: currentText, options: options.slice(0, 4), correctOption: correct });
        }
        currentText = trimmed.replace(/^q\d+[:.]?\s*/i, "");
        options = [];
        correct = 0;
      } else if (trimmed.startsWith("A.") || trimmed.startsWith("a.")) {
        options.push(trimmed.replace(/^[aA]\.\s*/, ""));
      } else if (trimmed.startsWith("B.") || trimmed.startsWith("b.")) {
        options.push(trimmed.replace(/^[bB]\.\s*/, ""));
      } else if (trimmed.startsWith("C.") || trimmed.startsWith("c.")) {
        options.push(trimmed.replace(/^[cC]\.\s*/, ""));
      } else if (trimmed.startsWith("D.") || trimmed.startsWith("d.")) {
        options.push(trimmed.replace(/^[dD]\.\s*/, ""));
      } else if (trimmed.toLowerCase().includes("answer:")) {
        const ansChar = trimmed.split(":")[1]?.trim()?.toUpperCase() || "A";
        correct = ansChar === "B" ? 1 : ansChar === "C" ? 2 : ansChar === "D" ? 3 : 0;
      }
    });

    if (currentText && options.length > 0) {
      parsedQuestions.push({ text: currentText, options: options.slice(0, 4), correctOption: correct });
    }

    return parsedQuestions;
  };

  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------
  
  // 1. Create Exam Workflow
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      toast.error("Please enter an exam title.");
      return;
    }

    let questions: (MCQQuestion | CodingQuestion)[] = [];

    // Parse Raw Text questions if available
    if (examType === "mcq" && pdfTextContext.trim()) {
      const parsed = parseRawQuestions(pdfTextContext);
      if (parsed.length > 0) {
        questions = parsed.slice(0, questionCount);
        toast.success(`Extracted ${questions.length} questions from raw input content!`);
      }
    }

    // Fallback if no questions parsed or coding mode
    if (questions.length === 0) {
      if (examType === "mcq") {
        const baseMcqQuestions: MCQQuestion[] = [
          {
            text: `What is the primary difference between a list and a tuple in ${examCategory}?`,
            options: [
              "Lists are mutable (modifiable) while tuples are immutable (read-only).",
              "Tuples can store duplicates while lists cannot.",
              "Lists use parentheses while tuples use square brackets.",
              "Lists are faster than tuples for lookups."
            ],
            correctOption: 0
          },
          {
            text: `How do you declare a dictionary key-value pair in ${examCategory}?`,
            options: [
              "{key: value}",
              "[key = value]",
              "(key => value)",
              "set(key, value)"
            ],
            correctOption: 0
          },
          {
            text: `Which operator is used for exponentiation (power) in ${examCategory}?`,
            options: ["^", "**", "pow", "//"],
            correctOption: 1
          },
          {
            text: "Which of the following data structures stores unique elements in unordered form?",
            options: ["List", "Tuple", "Set", "Dictionary"],
            correctOption: 2
          },
          {
            text: "What does the 'self' keyword represent in class methods?",
            options: [
              "A reference to the class definition",
              "A reference to the current instance of the class",
              "A local dictionary containing class attributes",
              "A reserved system variable representing metadata"
            ],
            correctOption: 1
          }
        ];
        questions = baseMcqQuestions.slice(0, questionCount);
      } else {
        const baseCodingQuestions: CodingQuestion[] = [
          {
            text: `Write a ${examCategory} function called 'find_max(numbers)' that accepts a list of integers and returns the largest number in that list. Do not use the built-in max() function.`,
            initialCode: `def find_max(numbers):\n    # Write your code here\n    if not numbers:\n        return None\n    max_val = numbers[0]\n    for num in numbers:\n        if num > max_val:\n            max_val = num\n    return max_val\n`
          },
          {
            text: `Write a ${examCategory} function called 'is_palindrome(text)' that checks whether a given string is a palindrome (reads the same backward as forward). Ignore case and spaces.`,
            initialCode: `def is_palindrome(text):\n    # Write your code here\n    cleaned = "".join(c.lower() for c in text if c.isalnum())\n    return cleaned == cleaned[::-1]\n`
          },
          {
            text: `Write a ${examCategory} function called 'binary_search(arr, target)' that implements binary search on a sorted list 'arr' and returns the index of the 'target'. Return -1 if the target is not found.`,
            initialCode: `def binary_search(arr, target):\n    # Write your code here\n    low = 0\n    high = len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n`
          }
        ];
        questions = baseCodingQuestions.slice(0, questionCount);
      }
    }

    const examRoomId = "EXAM-" + Math.floor(100000 + Math.random() * 900000);
    const panelRoomId = "PANEL-" + Math.floor(100000 + Math.random() * 900000);
    const adminPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newSession: ExamSession = {
      examRoomId,
      panelRoomId,
      adminPin,
      title: examTitle,
      category: examCategory,
      duration: examDuration,
      examType,
      showAnswersAfterExam,
      questions,
      students: {}
    };

    // Store session locally for instant fallback
    try {
      const stored = localStorage.getItem("local_exam_sessions");
      const sessions = stored ? JSON.parse(stored) : {};
      sessions[examRoomId] = newSession;
      localStorage.setItem("local_exam_sessions", JSON.stringify(sessions));
    } catch (err) {
      console.warn("LocalStorage save warning", err);
    }

    try {
      // Store session in Firebase Firestore
      await setDoc(doc(db, "examSessions", examRoomId), {
        examRoomId,
        panelRoomId,
        adminPin,
        title: examTitle,
        category: examCategory,
        duration: examDuration,
        examType,
        showAnswersAfterExam,
        questions
      });
      toast.success(`Secure room generated on Firebase!`);
    } catch (err) {
      console.warn("Firebase upload error, continuing locally", err);
      toast.success(`Secure room generated and launched!`);
    }

    setActiveSession(newSession);
    setAdminRoomId(examRoomId);
    setAdminPinInput(adminPin);
    setMode("monitor_dashboard");
  };

  // 2. Student: Verify and Enter Exam Room
  const handleStudentJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRoomId.trim() || !studentName.trim() || !studentEmail.trim()) {
      toast.error("Please fill in all entry credentials.");
      return;
    }

    let roomId = studentRoomId.trim().toUpperCase();
    if (/^\d{6}$/.test(roomId)) {
      roomId = "EXAM-" + roomId;
    }

    try {
      let sessionData: any = null;

      try {
        const sessionDoc = await getDoc(doc(db, "examSessions", roomId));
        if (sessionDoc.exists()) {
          sessionData = sessionDoc.data();
        }
      } catch (err) {
        console.warn("Firestore fetch error, checking localStorage", err);
      }

      if (!sessionData) {
        try {
          const stored = localStorage.getItem("local_exam_sessions");
          const sessions = stored ? JSON.parse(stored) : {};
          sessionData = sessions[roomId];
        } catch (err) {
          console.warn("LocalStorage fetch error", err);
        }
      }

      if (!sessionData) {
        toast.error("Invalid Room Code. Verify with your invigilator.");
        return;
      }

      const emailKey = studentEmail.trim().toLowerCase();
      let existingRecord: StudentRecord | null = null;

      try {
        const studentDoc = await getDoc(doc(db, "examSessions", roomId, "students", emailKey));
        if (studentDoc.exists()) {
          existingRecord = studentDoc.data() as StudentRecord;
        }
      } catch (err) {
        console.warn("Firestore student record check error", err);
      }

      if (!existingRecord && activeSession?.students?.[emailKey]) {
        existingRecord = activeSession.students[emailKey];
      }

      if (existingRecord) {
        if (existingRecord.status === "locked") {
          setCurrentStudentEmail(emailKey);
          setActiveSession({ ...sessionData, examRoomId: roomId, students: { [emailKey]: existingRecord } });
          setMode("student_login");
          toast.error("Your exam session is locked due to violations. Request examiner unlock.");
          return;
        }

        if (existingRecord.status === "submitted") {
          toast.error("You have already completed and submitted this exam paper.");
          return;
        }
      }

      const initialAnswers = sessionData.questions.map((q: any) => 
        sessionData.examType === "coding" ? q.initialCode : -1
      );

      const record: StudentRecord = {
        name: studentName,
        email: emailKey,
        currentIndex: 0,
        answers: initialAnswers,
        warnings: 0,
        status: "active",
        logs: [{ timestamp: new Date().toLocaleTimeString(), message: "Joined the exam hall entry portal", type: "info" }]
      };

      try {
        await setDoc(doc(db, "examSessions", roomId, "students", emailKey), record);
      } catch (err) {
        console.warn("Firestore set student record warning", err);
      }

      const nextSession = {
        ...(sessionData || activeSession || {}),
        examRoomId: roomId,
        students: {
          ...((sessionData || activeSession)?.students || {}),
          [emailKey]: record
        }
      };

      try {
        const stored = localStorage.getItem("local_exam_sessions");
        const sessions = stored ? JSON.parse(stored) : {};
        sessions[roomId] = nextSession;
        localStorage.setItem("local_exam_sessions", JSON.stringify(sessions));
      } catch (err) {
        console.warn("LocalStorage save student join error", err);
      }

      setActiveSession(nextSession);
      setCurrentStudentEmail(emailKey);
      setStudentAnswers(initialAnswers);
      setStudentWarnings(0);
      setStudentLogs(record.logs);
      setStudentCurrentIndex(0);
      setExamTimeLeft((sessionData.duration || 15) * 60);
      setMode("student_rules");
      toast.success("Joined exam room successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Connection error. Please try again.");
    }
  };

  // 3. Admin: Access Live Monitoring Board
  const handleAdminPanelLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminRoomId.trim() || !adminPinInput.trim()) {
      toast.error("Room ID and Admin PIN are required.");
      return;
    }

    let roomId = adminRoomId.trim().toUpperCase();
    if (/^\d{6}$/.test(roomId)) {
      roomId = "EXAM-" + roomId;
    }

    try {
      let sessionData: any = null;

      try {
        const sessionDoc = await getDoc(doc(db, "examSessions", roomId));
        if (sessionDoc.exists()) {
          sessionData = sessionDoc.data();
        }
      } catch (err) {
        console.warn("Firestore fetch error for admin", err);
      }

      if (!sessionData) {
        try {
          const stored = localStorage.getItem("local_exam_sessions");
          const sessions = stored ? JSON.parse(stored) : {};
          sessionData = sessions[roomId];
        } catch (err) {
          console.warn("LocalStorage fetch error", err);
        }
      }

      if (!sessionData) {
        toast.error("Room ID not found in database.");
        return;
      }
      
      if (sessionData.adminPin !== adminPinInput.trim()) {
        toast.error("Incorrect Admin PIN.");
        return;
      }

      let studentMap: { [email: string]: StudentRecord } = sessionData.students || {};

      try {
        const querySnap = await getDocs(collection(db, "examSessions", roomId, "students"));
        querySnap.forEach((doc) => {
          studentMap[doc.id] = doc.data() as StudentRecord;
        });
      } catch (err) {
        console.warn("Firestore fetch students error", err);
      }

      setActiveSession({ ...sessionData, examRoomId: roomId, students: studentMap });
      toast.success("Invigilator Panel Connected.");
      setMode("monitor_dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard statistics.");
    }
  };

  // -------------------------------------------------------------
  // Student Anti-Cheat Workspace Actions
  // -------------------------------------------------------------
  const logStudentEvent = async (message: string, type: "info" | "warning" | "error") => {
    if (!activeSession || !currentStudentEmail) return;

    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };

    const updatedLogs = [...studentLogs, newLog];
    setStudentLogs(updatedLogs);

    updateLocalStudentState((prev) => ({
      ...prev,
      logs: updatedLogs
    }));

    try {
      await updateDoc(
        doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
        { logs: updatedLogs }
      );
    } catch (err) {
      console.error("Failed to log telemetry event", err);
    }
  };

  // Anti-Cheat: Toggle Fullscreen
  const requestFullScreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setIsFullScreen(true);
      setMode("student_exam");
      await logStudentEvent("Started full-screen exam mode", "info");
    } catch (err) {
      console.warn("Fullscreen request failed, transitioning to exam mode anyway", err);
      setIsFullScreen(true);
      setMode("student_exam");
      await logStudentEvent("Started exam mode (Fullscreen fallback)", "info");
    }
  };

  // Warning Accumulator
  const triggerCheatWarning = async (reason: string) => {
    if (!activeSession || !currentStudentEmail) return;

    const now = Date.now();
    if (now - lastCheatWarningTimeRef.current < 4000) {
      // Cooldown 4s between face/gaze/window warnings to prevent spam
      return;
    }
    lastCheatWarningTimeRef.current = now;

    const nextWarnings = studentWarnings + 1;
    setStudentWarnings(nextWarnings);

    let status: "active" | "locked" = "active";
    if (nextWarnings >= 3) {
      status = "locked";
      setMode("student_login");
      document.exitFullscreen().catch(() => {});
      toast.error("Exam Locked! You exceeded 3 anti-cheat warnings. Request invigilator unlock PIN.");
    }

    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: `Anti-cheat violation: ${reason} (Warning ${nextWarnings}/3)`,
      type: "warning" as const
    };

    const updatedLogs = [...studentLogs, newLog];
    setStudentLogs(updatedLogs);

    updateLocalStudentState((prev) => ({
      ...prev,
      warnings: nextWarnings,
      status,
      logs: updatedLogs
    }));

    toast.warning(`Violation Warning: ${reason}! (${nextWarnings} / 3)`);

    try {
      await updateDoc(
        doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
        {
          warnings: nextWarnings,
          status,
          logs: updatedLogs
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Exam helper
  const submitExamAutomatically = async () => {
    if (!activeSession || !currentStudentEmail) return;

    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: "Exam submitted successfully",
      type: "info" as const
    };

    const updatedLogs = [...studentLogs, newLog];
    setStudentLogs(updatedLogs);
    setMode("student_submitted");
    document.exitFullscreen().catch(() => {});

    updateLocalStudentState((prev) => ({
      ...prev,
      status: "submitted",
      answers: studentAnswers,
      logs: updatedLogs
    }));

    try {
      await updateDoc(
        doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
        {
          status: "submitted",
          answers: studentAnswers,
          logs: updatedLogs
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Student manual answer selection (MCQ) or code modification (Coding)
  const handleSelectOption = async (qIndex: number, optionIndex: number) => {
    const updated = [...studentAnswers];
    updated[qIndex] = optionIndex;
    setStudentAnswers(updated);

    if (activeSession && currentStudentEmail) {
      updateLocalStudentState((prev) => ({
        ...prev,
        answers: updated
      }));

      try {
        await updateDoc(
          doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
          { answers: updated }
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateCode = async (qIndex: number, code: string) => {
    const updated = [...studentAnswers];
    updated[qIndex] = code;
    setStudentAnswers(updated);

    if (activeSession && currentStudentEmail) {
      updateLocalStudentState((prev) => ({
        ...prev,
        answers: updated
      }));

      try {
        await updateDoc(
          doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
          { answers: updated }
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Student next/prev buttons
  const handleNextQuestion = async () => {
    if (!activeSession || !currentStudentEmail) return;
    const nextIdx = studentCurrentIndex + 1;
    setStudentCurrentIndex(nextIdx);

    try {
      await updateDoc(
        doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
        { currentIndex: nextIdx }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrevQuestion = async () => {
    if (!activeSession || !currentStudentEmail) return;
    const prevIdx = studentCurrentIndex - 1;
    setStudentCurrentIndex(prevIdx);

    try {
      await updateDoc(
        doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
        { currentIndex: prevIdx }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSubmit = () => {
    submitExamAutomatically();
    toast.success("Exam submitted successfully!");
  };

  // Student Unlock Session (Admin PIN entry)
  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !currentStudentEmail) return;

    if (unlockPinInput.trim() !== activeSession.adminPin) {
      toast.error("Incorrect Admin PIN. Please ask your invigilator.");
      return;
    }

    try {
      const emailKey = currentStudentEmail;
      const ref = doc(db, "examSessions", activeSession.examRoomId, "students", emailKey);

      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        message: "Invigilator unlocked the session",
        type: "info" as const
      };
      const updatedLogs = [...studentLogs, newLog];

      await updateDoc(ref, {
        status: "active",
        warnings: 0,
        logs: updatedLogs
      });

      setStudentWarnings(0);
      setStudentLogs(updatedLogs);
      setUnlockPinInput("");
      toast.success("Session unlocked. Re-enter the exam hall.");
      setMode("student_rules");
    } catch (err) {
      console.error(err);
      toast.error("Failed to unlock. Check your connectivity.");
    }
  };

  // Admin Monitor Reset student
  const handleAdminResetStudent = async (email: string) => {
    if (!activeSession) return;
    try {
      const student = activeSession.students[email];
      if (!student) return;

      const ref = doc(db, "examSessions", activeSession.examRoomId, "students", email);
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        message: "Invigilator reset warnings/status from dashboard",
        type: "info" as const
      };
      const updatedLogs = [...student.logs, newLog];

      await updateDoc(ref, {
        status: "active",
        warnings: 0,
        logs: updatedLogs
      });

      toast.success(`Reset status for student: ${student.name}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset student status.");
    }
  };

  // Leaderboard sorting helper
  const getLeaderboardList = () => {
    if (!activeSession) return [];
    return Object.values(activeSession.students).sort((a, b) => {
      return getStudentScore(b, activeSession) - getStudentScore(a, activeSession);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl min-h-[calc(100vh-80px)] flex flex-col justify-center relative">
      
      {/* Top Left Return Button - Left Arrow Only */}
      {mode === "select" && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            title="Return to Dashboard"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-background/90 backdrop-blur-md border-border/60 hover:bg-primary/10 hover:border-primary/40 text-foreground shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODE SELECT SCREEN
          ------------------------------------------------------------- */}
      {mode === "select" && (
        <div className="space-y-6 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2 text-primary border border-primary/20">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Secure Exam Area</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Real-time eye-tracking validation, tab-switching lockouts, and LeetCode-style coding simulations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-4">
            
            {/* Candidate Card */}
            <Card className="bg-card/50 backdrop-blur-md border border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-300 flex flex-col justify-between group">
              <CardHeader>
                <div className="p-2.5 bg-primary/10 rounded-xl w-fit text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl font-bold mt-2">Write Exam (Student)</CardTitle>
                <CardDescription className="text-xs">
                  Join the secure exam hall, verify your webcam tracking, and code/answer questions in a locked full-screen console.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Button className="w-full font-semibold group-hover:translate-x-0.5 transition-transform" onClick={() => setMode("student_login")}>
                  Enter Exam Room <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>

            {/* Admin Card */}
            <Card className="bg-card/50 backdrop-blur-md border border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-300 flex flex-col justify-between group">
              <CardHeader>
                <div className="p-2.5 bg-primary/10 rounded-xl w-fit text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Settings className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl font-bold mt-2">Create & Monitor (Admin)</CardTitle>
                <CardDescription className="text-xs">
                  Generate secure MCQ or Coding exam chambers, customize duration limits, and track active candidate sessions live.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 gap-2 flex-col sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto flex-1 font-semibold" onClick={() => setMode("create")}>
                  <Plus className="w-4 h-4 mr-1" /> Create Exam
                </Button>
                <Button variant="secondary" className="w-full sm:w-auto flex-1 font-semibold" onClick={() => setMode("monitor_login")}>
                  <Terminal className="w-4 h-4 mr-1" /> Invigilator Dashboard
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CREATE EXAM SCREEN (ADMIN)
          ------------------------------------------------------------- */}
      {mode === "create" && (
        <Card className="max-w-2xl mx-auto w-full bg-card/50 backdrop-blur-md border border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" /> Create Secure Exam
            </CardTitle>
            <CardDescription className="text-xs">
              Upload PDF materials or setup coding simulation tasks to generate your secured room.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateExam}>
            <CardContent className="space-y-4">
              
              {/* Select Exam Type (MCQ vs Coding) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Exam Format Mode</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => {
                      setExamType("mcq");
                      setQuestionCount(5);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      examType === "mcq" 
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "border-border bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <FileText className={`w-5 h-5 ${examType === "mcq" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-left">
                      <div className="text-xs font-bold">Upload PDF / Raw MCQs</div>
                      <div className="text-[10px] text-muted-foreground">Multiple choice questions</div>
                    </div>
                  </div>
                  <div 
                    onClick={() => {
                      setExamType("coding");
                      setQuestionCount(3);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      examType === "coding" 
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "border-border bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <Code className={`w-5 h-5 ${examType === "coding" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-left">
                      <div className="text-xs font-bold">Coding Simulation</div>
                      <div className="text-[10px] text-muted-foreground">LeetCode editor window</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-title" className="text-xs font-semibold">Exam Title</Label>
                  <Input 
                    id="exam-title" 
                    placeholder="e.g. Python Advanced Concepts" 
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam-category" className="text-xs font-semibold">Topic Category</Label>
                  <select 
                    id="exam-category"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={examCategory}
                    onChange={(e) => setExamCategory(e.target.value)}
                  >
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="React">React</option>
                    <option value="Database">SQL Databases</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-duration" className="text-xs font-semibold">Duration (Minutes)</Label>
                  <Input 
                    id="exam-duration" 
                    type="number"
                    min="1"
                    max="180"
                    value={examDuration}
                    onChange={(e) => setExamDuration(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam-qcount" className="text-xs font-semibold">Number of Questions</Label>
                  <Input 
                    id="exam-qcount" 
                    type="number"
                    min="1"
                    max={examType === "coding" ? 3 : 5}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Show Corrections Setting */}
              {examType === "mcq" && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/15 text-xs text-left">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label className="font-bold">Show Answer Corrections after Submit</Label>
                    <p className="text-[10px] text-muted-foreground">Allows candidates to view the answer key and corrections once their exam paper is submitted.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showAnswersAfterExam}
                    onChange={(e) => setShowAnswersAfterExam(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-0 cursor-pointer"
                  />
                </div>
              )}

              {examType === "mcq" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="exam-pdf" className="text-xs font-semibold">Syllabus PDF / Questions Raw Data Copy-Paste</Label>
                    <span className="text-[10px] text-primary flex items-center gap-1 font-semibold cursor-pointer">
                      <Upload className="w-3 h-3" /> Simulate PDF Upload
                    </span>
                  </div>
                  <Textarea 
                    id="exam-pdf" 
                    placeholder="Paste sample exam MCQs or syllabus rules here (e.g. Q1. Text... A. Option1... B. Option2... Answer: B). The AI will structure them into the exam console..."
                    rows={4}
                    value={pdfTextContext}
                    onChange={(e) => setPdfTextContext(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-4">
              <Button type="button" variant="ghost" onClick={() => setMode("select")}>Cancel</Button>
              <Button type="submit" className="font-semibold">Secure & Launch Room <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* -------------------------------------------------------------
          ADMIN LIVE MONITOR PANEL
          ------------------------------------------------------------- */}
      {mode === "monitor_login" && (
        <Card className="max-w-md mx-auto w-full bg-card/50 backdrop-blur-md border border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <Terminal className="w-8 h-8 text-primary mx-auto mb-1" />
            <CardTitle className="text-xl font-bold">Admin Monitor Login</CardTitle>
            <CardDescription className="text-xs">
              Securely connect to your exam panel tracking board.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAdminPanelLogin}>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="admin-room" className="text-xs font-semibold">Exam Room ID</Label>
                <Input 
                  id="admin-room" 
                  placeholder="e.g. EXAM-123456" 
                  value={adminRoomId}
                  onChange={(e) => setAdminRoomId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-pin" className="text-xs font-semibold">Admin PIN</Label>
                <Input 
                  id="admin-pin" 
                  type="password"
                  placeholder="Enter 4-digit PIN" 
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setMode("select")}>Back</Button>
              <Button type="submit" className="font-semibold">Access Dashboard <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* -------------------------------------------------------------
          MONITOR DASHBOARD SCREEN (ADMIN VIEW)
          ------------------------------------------------------------- */}
      {mode === "monitor_dashboard" && activeSession && (
        <div className="space-y-6 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/40 p-4 rounded-xl backdrop-blur-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-primary tracking-wider mb-1">Active Invigilator Panel</div>
              <h2 className="text-xl font-extrabold tracking-tight">{activeSession.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Room ID: <span className="font-bold text-foreground">{activeSession.examRoomId}</span> | Admin PIN: <span className="font-bold text-foreground">{activeSession.adminPin}</span> | Format: <span className="font-bold text-primary">{activeSession.examType === "mcq" ? "MCQ Exam" : "Coding Simulation"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button 
                variant="secondary" 
                size="sm" 
                className="font-bold text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                onClick={populateDemoCandidates}
              >
                <Plus className="w-4 h-4 mr-1" /> Populate Demo Candidates
              </Button>
              {adminMonitorTab === "leaderboard" && (
                <Button variant="outline" size="sm" onClick={downloadLeaderboardCsv}>
                  <Download className="w-4 h-4 mr-1" /> Export Sheet
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => setMode("select")}>
                <LogOut className="w-4 h-4 mr-1" /> Exit Panel
              </Button>
            </div>
          </div>

          {/* Stats Ratio */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/30 border border-border/50 shadow-md">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Total Candidates</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> 
                  {Object.keys(activeSession.students).length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card/30 border border-border/50 shadow-md">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Writing Now</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-success">
                  <Play className="w-5 h-5 animate-pulse" /> 
                  {Object.values(activeSession.students).filter(s => s.status === "active").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card/30 border border-border/50 shadow-md">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Submitted</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                  <CheckCircle className="w-5 h-5" /> 
                  {Object.values(activeSession.students).filter(s => s.status === "submitted").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card/30 border border-border/50 shadow-md">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Locked Out</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-destructive">
                  <Lock className="w-5 h-5" /> 
                  {Object.values(activeSession.students).filter(s => s.status === "locked").length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Top Member / Leaderboard Winner Spotlight Banner */}
          {(() => {
            const leaderboard = getLeaderboardList();
            const topStudent = leaderboard.length > 0 ? leaderboard[0] : null;
            if (!topStudent) return null;

            return (
              <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-amber-500/15 border border-amber-500/35 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-4 text-left">
                  <div className="relative shrink-0">
                    {renderStudentAvatar(topStudent, "w-14 h-14")}
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 p-1.5 rounded-full shadow-lg border border-slate-900">
                      <Trophy className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> Top Member / Rank #1 Candidate
                    </div>
                    <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                      {topStudent.name}
                      <span className="text-xs font-semibold text-muted-foreground">({topStudent.email})</span>
                    </h3>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3 font-semibold">
                      <span>Score: <strong className="text-primary font-black">{getStudentScore(topStudent, activeSession)} / {activeSession.questions.length}</strong></span>
                      <span>Warnings: <strong className="text-destructive font-bold">{topStudent.warnings} / 3</strong></span>
                      <span>Status: <strong className="text-success uppercase font-bold">{topStudent.status}</strong></span>
                    </div>
                  </div>
                </div>

                <Button 
                  size="sm" 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0 shadow-md"
                  onClick={() => setSelectedStudentEmail(topStudent.email)}
                >
                  <Eye className="w-4 h-4 mr-1.5" /> Inspect Top Scorer & Photo ID
                </Button>
              </div>
            );
          })()}

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Panel: Invigilator tab selection details */}
            <Card className="lg:col-span-2 bg-card/30 border border-border/50 shadow-lg h-[480px] flex flex-col justify-between overflow-hidden">
              <CardHeader className="border-b border-border/50 py-3 bg-secondary/15 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" /> Live Invigilation Telemetry
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={adminMonitorTab === "logs" ? "default" : "ghost"}
                    size="xs"
                    onClick={() => setAdminMonitorTab("logs")}
                  >
                    Violations Logs
                  </Button>
                  <Button 
                    variant={adminMonitorTab === "leaderboard" ? "default" : "ghost"}
                    size="xs"
                    onClick={() => setAdminMonitorTab("leaderboard")}
                  >
                    Rankings / Scores
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
                
                {/* 1. Logs Tab */}
                {adminMonitorTab === "logs" && (
                  <div className="space-y-2.5 text-xs text-left">
                    {Object.values(activeSession.students).flatMap(s => 
                      s.logs.map(l => ({ ...l, student: s }))
                    ).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic py-32">
                        Waiting for candidates to perform actions...
                      </div>
                    ) : (
                      Object.values(activeSession.students).flatMap(s => 
                        s.logs.map(l => ({ ...l, student: s }))
                      ).sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map((log, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between leading-relaxed shadow-sm ${
                          log.type === "error" ? "bg-destructive/10 border-destructive/25 text-destructive" :
                          log.type === "warning" ? "bg-warning/10 border-warning/25 text-warning" :
                          "bg-secondary/40 border-border/30 text-muted-foreground"
                        }`}>
                          <div className="flex items-center gap-3">
                            {renderStudentAvatar(log.student, "w-8 h-8")}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{log.student.name}</span>
                                <span className="text-[10px] text-muted-foreground">({log.student.email})</span>
                              </div>
                              <div className="text-xs font-semibold mt-0.5 text-foreground">{log.message}</div>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] font-bold opacity-80 shrink-0">[{log.timestamp}]</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. Leaderboard / Rankings Tab */}
                {adminMonitorTab === "leaderboard" && (
                  <div className="w-full text-xs text-left">
                    {Object.keys(activeSession.students).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic py-32 text-center">
                        No candidates have registered or started the exam yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase">
                              <th className="py-2.5 px-3 text-left">Rank</th>
                              <th className="py-2.5 px-3 text-left">Photo ID</th>
                              <th className="py-2.5 px-3 text-left">Candidate Name</th>
                              <th className="py-2.5 px-3 text-left">Email Address</th>
                              <th className="py-2.5 px-3 text-left">Warnings</th>
                              <th className="py-2.5 px-3 text-left">Status</th>
                              <th className="py-2.5 px-3 text-center">Score</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getLeaderboardList().map((s, idx) => {
                              const isTop = idx === 0;
                              return (
                                <tr key={s.email} className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${isTop ? "bg-amber-500/10" : ""}`}>
                                  <td className="py-3 px-3 font-mono font-extrabold text-primary">
                                    {idx === 0 ? (
                                      <span className="flex items-center gap-1 text-amber-500 font-bold">🥇 #1</span>
                                    ) : idx === 1 ? (
                                      <span className="flex items-center gap-1 text-slate-400 font-bold">🥈 #2</span>
                                    ) : idx === 2 ? (
                                      <span className="flex items-center gap-1 text-amber-700 font-bold">🥉 #3</span>
                                    ) : (
                                      `#${idx + 1}`
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    {renderStudentAvatar(s, "w-8 h-8")}
                                  </td>
                                  <td className="py-3 px-3 font-bold flex items-center gap-2">
                                    {s.name}
                                    {isTop && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-500 font-extrabold border border-amber-500/30">
                                        👑 TOP
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-muted-foreground">{s.email}</td>
                                  <td className="py-3 px-3 text-destructive font-bold">{s.warnings} / 3</td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      s.status === "active" ? "bg-success/10 text-success border border-success/20" :
                                      s.status === "locked" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                                      "bg-primary/10 text-primary border border-primary/20"
                                    }`}>
                                      {s.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center font-extrabold text-sm text-foreground">
                                    {getStudentScore(s, activeSession)} / {activeSession.questions.length}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      className="h-7 text-[10px] font-semibold"
                                      onClick={() => setSelectedStudentEmail(s.email)}
                                    >
                                      <Eye className="w-3 h-3 mr-1" /> Inspect
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Candidates registry list */}
            <Card className="bg-card/30 border border-border/50 shadow-lg h-[480px] flex flex-col justify-between">
              <CardHeader className="border-b border-border/50 py-3.5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Candidate Registry List
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {Object.keys(activeSession.students).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                    No candidates registered yet.
                  </div>
                ) : (
                  Object.values(activeSession.students).map((s) => {
                    const isTop = getLeaderboardList()?.[0]?.email === s.email;
                    return (
                      <div key={s.email} className={`flex justify-between items-center p-3 rounded-xl border bg-card/20 text-xs transition-all ${isTop ? "border-amber-500/40 bg-amber-500/5 shadow-sm" : "border-border/40"}`}>
                        <div className="flex items-center gap-3">
                          {renderStudentAvatar(s, "w-9 h-9")}
                          <div className="space-y-0.5 text-left">
                            <div className="font-bold flex items-center gap-1.5">
                              {s.name}
                              {isTop && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-500 font-extrabold border border-amber-500/30">
                                  👑 TOP
                                </span>
                              )}
                              {s.status === "locked" && <Lock className="w-3 h-3 text-destructive shrink-0" />}
                              {s.status === "submitted" && <CheckCircle className="w-3 h-3 text-success shrink-0" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{s.email}</div>
                            <div className="text-[10px]">
                              Score: <span className="font-extrabold text-primary">{getStudentScore(s, activeSession)}</span> | Warnings: <span className="font-bold text-destructive">{s.warnings}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="secondary"
                            size="xs"
                            className="h-7 text-[10px] font-semibold"
                            onClick={() => setSelectedStudentEmail(s.email)}
                          >
                            <Eye className="w-3 h-3 mr-1" /> Inspect Details
                          </Button>
                          {s.status === "locked" && (
                            <Button 
                              variant="outline" 
                              size="xs"
                              className="h-7 text-[10px] font-semibold border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => handleAdminResetStudent(s.email)}
                            >
                              <Unlock className="w-3 h-3 mr-1" /> Unlock
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>

          {/* Candidate Profile & Photo Identity Inspector Modal */}
          {selectedStudentEmail && activeSession?.students?.[selectedStudentEmail] && (() => {
            const inspectedStudent = activeSession.students[selectedStudentEmail];
            const leaderboard = getLeaderboardList();
            const rankIndex = leaderboard.findIndex(s => s.email === inspectedStudent.email);
            const rankNum = rankIndex !== -1 ? rankIndex + 1 : "-";
            const isTopScorer = rankIndex === 0;

            return (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <Card className="max-w-3xl w-full max-h-[90vh] flex flex-col justify-between bg-card border border-border shadow-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/50 py-4 px-6 flex flex-row justify-between items-center bg-secondary/20">
                    <div className="flex items-center gap-3">
                      {renderStudentAvatar(inspectedStudent, "w-12 h-12")}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold">{inspectedStudent.name}</CardTitle>
                          {isTopScorer && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> Top Scorer #1
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">
                          {inspectedStudent.email} • Exam Room: <span className="font-mono font-bold text-foreground">{activeSession.examRoomId}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudentEmail(null)}>Close</Button>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Identity & Quick Stats Header Grid */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      {/* Identity Card */}
                      <div className="sm:col-span-1 bg-secondary/30 border border-border/50 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
                        {inspectedStudent.photoUrl ? (
                          <img 
                            src={inspectedStudent.photoUrl} 
                            alt={inspectedStudent.name} 
                            className="w-24 h-24 rounded-xl object-cover border-2 border-primary/50 shadow-md"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-primary/60 text-primary-foreground font-black flex items-center justify-center text-2xl shadow-inner border border-primary/40">
                            {inspectedStudent.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                        )}
                        <div className="text-xs font-bold text-foreground mt-1">Photo Identity</div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-success/15 text-success border border-success/30 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> AI Face Verified
                        </span>
                      </div>

                      {/* Performance & Status Box */}
                      <div className="sm:col-span-2 bg-secondary/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between space-y-3 text-left">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Leaderboard Rank</span>
                            <div className="text-lg font-extrabold text-primary flex items-center gap-1.5 mt-0.5">
                              <Trophy className="w-4 h-4 text-amber-500" /> Rank #{rankNum}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Current Score</span>
                            <div className="text-lg font-extrabold text-foreground mt-0.5">
                              {getStudentScore(inspectedStudent, activeSession)} / {activeSession.questions.length}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Anti-Cheat Warnings</span>
                            <div className="text-lg font-extrabold text-destructive mt-0.5">
                              {inspectedStudent.warnings} / 3
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Session Status</span>
                            <div className="mt-0.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                                inspectedStudent.status === "active" ? "bg-success/15 text-success border border-success/30" :
                                inspectedStudent.status === "locked" ? "bg-destructive/15 text-destructive border border-destructive/30" :
                                "bg-primary/15 text-primary border border-primary/30"
                              }`}>
                                {inspectedStudent.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {inspectedStudent.status === "locked" && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full font-bold"
                            onClick={() => handleAdminResetStudent(inspectedStudent.email)}
                          >
                            <Unlock className="w-4 h-4 mr-1.5" /> Unlock Candidate Session
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Submissions Details */}
                    <div className="space-y-3 text-left">
                      <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary" /> Submitted Answers & Paper Inspection
                      </div>
                      
                      <div className="space-y-4">
                        {activeSession.questions.map((q: any, idx: number) => {
                          const submission = inspectedStudent.answers[idx];
                          if (activeSession.examType === "coding") {
                            return (
                              <div key={idx} className="p-4 rounded-xl border border-border/40 bg-secondary/20 space-y-2">
                                <div className="text-xs font-bold text-primary">Question {idx + 1}: {q.text}</div>
                                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-xs text-slate-100 whitespace-pre overflow-x-auto">
                                  {typeof submission === "string" && submission.trim() ? submission : "# No code written yet"}
                                </div>
                              </div>
                            );
                          } else {
                            const isCorrect = submission === q.correctOption;
                            return (
                              <div key={idx} className="p-3.5 rounded-xl border border-border/40 bg-secondary/20 text-xs space-y-2">
                                <div className="font-bold flex items-center justify-between">
                                  <span>Q{idx + 1}. {q.text}</span>
                                  {submission >= 0 && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                                    }`}>
                                      {isCorrect ? "CORRECT" : "INCORRECT"}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="p-2 rounded bg-card border border-border/40">
                                    <span className="text-muted-foreground font-semibold">Candidate Selected: </span>
                                    <span className="font-bold text-foreground">
                                      {submission >= 0 ? q.options[submission] : "Not Answered"}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded bg-card border border-border/40">
                                    <span className="text-muted-foreground font-semibold">Correct Option: </span>
                                    <span className="font-bold text-success">
                                      {q.options[q.correctOption]}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>

                    {/* Anti-cheat audit history */}
                    <div className="space-y-2 text-left">
                      <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-warning" /> Telemetry Violation Audit Log
                      </div>
                      <div className="bg-secondary/20 border border-border/40 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-1.5 font-mono text-[11px]">
                        {inspectedStudent.logs.length === 0 ? (
                          <div className="text-muted-foreground italic py-4 text-center">No violations recorded for this candidate.</div>
                        ) : (
                          inspectedStudent.logs.map((l, i) => (
                            <div key={i} className={`p-1.5 rounded border ${
                              l.type === "warning" ? "bg-warning/10 border-warning/30 text-warning" :
                              l.type === "error" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                              "bg-card border-border/30 text-muted-foreground"
                            }`}>
                              <span className="font-bold">[{l.timestamp}]</span> {l.message}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

        </div>
      )}

      {/* -------------------------------------------------------------
          STUDENT LOGIN / LOCK SCREEN
          ------------------------------------------------------------- */}
      {mode === "student_login" && (
        <Card className="max-w-md mx-auto w-full bg-card/50 backdrop-blur-md border border-border/50 shadow-2xl">
          {activeSession && activeSession.students[currentStudentEmail]?.status === "locked" ? (
            // LOCKOUT VIEW
            <>
              <CardHeader className="text-center">
                <div className="p-3 bg-destructive/10 rounded-full w-fit mx-auto text-destructive border border-destructive/20 mb-2">
                  <Lock className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl font-bold text-destructive">Exam Session Locked</CardTitle>
                <CardDescription className="text-xs">
                  Your session was automatically locked due to exceeding 3 anti-cheat warnings. Ask your examiner to unlock.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleUnlockSession}>
                <CardContent className="space-y-2 text-left">
                  <Label htmlFor="unlock-pin" className="text-xs font-semibold">Enter Invigilator Admin PIN to Unlock</Label>
                  <Input 
                    id="unlock-pin" 
                    type="password"
                    placeholder="Enter 4-digit Admin PIN"
                    value={unlockPinInput}
                    onChange={(e) => setUnlockPinInput(e.target.value)}
                  />
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Button type="button" variant="ghost" onClick={() => setMode("select")}>Exit Hall</Button>
                  <Button type="submit" variant="destructive" className="font-semibold">Unlock Session</Button>
                </CardFooter>
              </form>
            </>
          ) : (
            // STANDARD LOGIN VIEW
            <>
              <CardHeader className="text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-1" />
                <CardTitle className="text-xl font-bold">Student Exam Login</CardTitle>
                <CardDescription className="text-xs">
                  Enter your exam credentials and room code to start.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleStudentJoin}>
                <CardContent className="space-y-3 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="student-room" className="text-xs font-semibold">Exam Room ID</Label>
                    <Input 
                      id="student-room" 
                      placeholder="e.g. EXAM-123456" 
                      value={studentRoomId}
                      onChange={(e) => setStudentRoomId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-name" className="text-xs font-semibold">Candidate Name</Label>
                    <Input 
                      id="student-name" 
                      placeholder="Your Full Name" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-email" className="text-xs font-semibold">Candidate Email</Label>
                    <Input 
                      id="student-email" 
                      type="email"
                      placeholder="your.name@email.com" 
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Button type="button" variant="ghost" onClick={() => setMode("select")}>Cancel</Button>
                  <Button type="submit" className="font-semibold">Verify Room <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      )}

      {/* -------------------------------------------------------------
          STUDENT RULES / CAMERA VALIDATION SCREEN
          ------------------------------------------------------------- */}
      {mode === "student_rules" && activeSession && (
        <Card className="max-w-2xl mx-auto w-full bg-card/50 backdrop-blur-md border border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Anti-Cheat Rules Agreement
            </CardTitle>
            <CardDescription className="text-xs">
              Please review the invigilator regulations before starting the exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Rules guidelines */}
            <div className="bg-secondary/40 border border-border/50 rounded-lg p-4 text-xs space-y-2 leading-relaxed text-left">
              <div className="font-bold flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-4 h-4" /> Mandatory Compliance:
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>The exam environment will run in **Full Screen mode**.</li>
                <li>**Escaping full screen or switching tabs** will automatically submit your exam immediately without warnings.</li>
                <li>Your webcam will monitor your posture and head movements. Looking away from the screen or turning your head will accumulate warnings.</li>
                <li>Reaching **3 warnings** will lock your exam. Only the invigilator can unlock it.</li>
                <li>Taking screenshots or using keyboard screenshot keys will trigger violations.</li>
              </ul>
            </div>

            {/* Simulated camera verification */}
            <div className="border border-border/50 rounded-xl overflow-hidden relative bg-black/10 aspect-video flex flex-col items-center justify-center p-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="max-w-[280px] w-full aspect-video border-2 border-primary/40 rounded-lg overflow-hidden bg-background/90 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="w-8 h-8 text-primary animate-pulse mb-1" />
                  <div className="text-xs font-bold text-foreground">Webcam Validation</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Ensure your face is clearly centered in front of the screen.</div>
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-4">
            <Button variant="ghost" onClick={() => setMode("student_login")}>Cancel</Button>
            <Button className="font-semibold" onClick={requestFullScreen}>
              Enter Monitored Exam Room <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* -------------------------------------------------------------
          STUDENT SECURE EXAM THEATRE
          ------------------------------------------------------------- */}
      {mode === "student_exam" && activeSession && (
        <div 
          ref={containerRef}
          className="fixed inset-0 w-screen h-screen bg-background z-50 flex flex-col justify-between text-foreground select-none"
        >
          {/* Header */}
          <div className="bg-card/60 backdrop-blur-md border-b border-border/50 px-6 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary shrink-0 animate-pulse" />
              <span className="font-bold tracking-tight text-gradient">{activeSession.title}</span>
            </div>
            <div className="flex items-center gap-6 font-semibold">
              <div className="flex items-center gap-1.5 text-warning">
                <AlertTriangle className="w-4 h-4" /> 
                Warnings: <span className="font-bold">{studentWarnings} / 3</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground bg-secondary/50 px-3 py-1 rounded-md border border-border/30">
                <Clock className="w-4 h-4 text-primary shrink-0 animate-spin-slow" />
                Time Remaining: <span className="font-mono font-bold text-sm text-primary">{formatTime(examTimeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Main Theatre Workspace */}
          <div className="flex-1 grid md:grid-cols-4 gap-6 p-6 overflow-hidden relative">
            
            {/* Left Column: Live camera monitoring overlay */}
            <div className="md:col-span-1 flex flex-col justify-between gap-4 h-full">
              <Card className="bg-card/40 backdrop-blur-sm border border-border/40 overflow-hidden relative flex-1 flex flex-col justify-between shadow-xl">
                <div className="p-3 bg-secondary/30 border-b border-border/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-primary" /> AI Camera Tracking
                </div>
                
                {/* Embedded webcam frame */}
                <div className="flex-1 relative bg-black/10 flex items-center justify-center p-3">
                  <div className="w-full h-full rounded-lg overflow-hidden border border-border/50 relative">
                    {isFaceTrackingActive ? (
                      <FaceRecognition
                        mode="monitor"
                        compact={true}
                        enabled={isFaceTrackingActive}
                        onEyeContactChange={(hasContact) => {
                          if (!hasContact) {
                            triggerCheatWarning("Candidate turned head / looked away from screen");
                          }
                        }}
                        onFaceDetected={(present) => {
                          if (present === false) {
                            triggerCheatWarning("Candidate face not visible in camera frame");
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
                        Camera Off
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-secondary/30 border-t border-border/30 space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                    <span>Pose Stability:</span>
                    <span className="text-success font-bold">Excellent</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                    <span>Status:</span>
                    <span className="text-success font-bold">Face Detected</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right/Middle Column: MCQ/Coding Examination Panel */}
            <div className="md:col-span-3 flex flex-col justify-between h-full">
              {(() => {
                const question = activeSession.questions[studentCurrentIndex];
                if (!question) return null;

                if (activeSession.examType === "coding") {
                  const currentCode = studentAnswers[studentCurrentIndex] || "";
                  return (
                    <Card className="bg-card/50 backdrop-blur-md border border-border/50 p-6 flex-1 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                      <div className="flex-1 flex flex-col justify-between space-y-4 h-full overflow-hidden">
                        
                        {/* Upper pane: Question details */}
                        <div className="space-y-1 shrink-0 text-left">
                          <div className="text-[10px] uppercase font-bold text-primary tracking-wider">
                            Coding Question {studentCurrentIndex + 1} of {activeSession.questions.length}
                          </div>
                          <h3 className="text-sm font-bold leading-relaxed">{question.text}</h3>
                        </div>

                        {/* Lower pane: Integrated Monospace Compiler Editor */}
                        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex justify-between items-center text-[10px] font-mono text-slate-400">
                            <span>main.{activeSession.category.toLowerCase()}</span>
                            <span className="text-xs text-primary font-bold">Editor Ready</span>
                          </div>
                          <textarea
                            value={currentCode}
                            onChange={(e) => handleUpdateCode(studentCurrentIndex, e.target.value)}
                            className="flex-1 p-4 bg-slate-900/90 text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed select-text"
                            placeholder="# Write your function implementation here..."
                            spellCheck="false"
                          />
                        </div>

                      </div>

                      {/* Question Navigation */}
                      <div className="flex justify-between items-center pt-4 border-t border-border/50 mt-4 shrink-0">
                        <Button 
                          variant="outline"
                          onClick={handlePrevQuestion}
                          disabled={studentCurrentIndex === 0}
                        >
                          Previous
                        </Button>
                        
                        {studentCurrentIndex === activeSession.questions.length - 1 ? (
                          <Button 
                            variant="default"
                            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
                            onClick={handleManualSubmit}
                          >
                            Submit Exam
                          </Button>
                        ) : (
                          <Button 
                            variant="default"
                            onClick={handleNextQuestion}
                          >
                            Next Question
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                } else {
                  // MCQ EXAM PANEL VIEW
                  const selectedOption = studentAnswers[studentCurrentIndex];
                  return (
                    <Card className="bg-card/50 backdrop-blur-md border border-border/50 p-6 flex-1 flex flex-col justify-between shadow-2xl relative overflow-y-auto">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2 text-left">
                          Question {studentCurrentIndex + 1} of {activeSession.questions.length}
                        </div>
                        <h3 className="text-lg font-bold leading-snug text-left">{question.text}</h3>

                        {/* Options Grid */}
                        <div className="space-y-3 pt-6">
                          {(question as MCQQuestion).options.map((option, idx) => {
                            const isSelected = selectedOption === idx;
                            return (
                              <div 
                                key={idx}
                                onClick={() => handleSelectOption(studentCurrentIndex, idx)}
                                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                  isSelected 
                                    ? "bg-primary/10 border-primary shadow-md"
                                    : "border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-border"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"
                                }`}>
                                  {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-sm font-medium">{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Left/Right question navigation */}
                      <div className="flex justify-between items-center pt-6 border-t border-border/50 mt-6">
                        <Button 
                          variant="outline"
                          onClick={handlePrevQuestion}
                          disabled={studentCurrentIndex === 0}
                        >
                          Previous
                        </Button>
                        
                        {studentCurrentIndex === activeSession.questions.length - 1 ? (
                          <Button 
                            variant="default"
                            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
                            onClick={handleManualSubmit}
                          >
                            Submit Exam
                          </Button>
                        ) : (
                          <Button 
                            variant="default"
                            onClick={handleNextQuestion}
                          >
                            Next Question
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                }
              })()}
            </div>

          </div>

          {/* Footer Controls */}
          <div className="bg-card/60 backdrop-blur-md border-t border-border/50 px-6 py-4 flex items-center justify-between z-10 text-xs">
            <div className="text-muted-foreground text-left">
              Candidate: <span className="font-bold text-foreground">{student?.name} ({student?.email})</span>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setMode("student_submitted")}>
              Exit Exam
            </Button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          STUDENT SUBMITTED / SCORE PAGE
          ------------------------------------------------------------- */}
      {/* -------------------------------------------------------------
          STUDENT SUBMITTED / SCORE PAGE (LIVE EXAM RESULTS)
          ------------------------------------------------------------- */}
      {mode === "student_submitted" && activeSession && (() => {
        const answersToUse = student?.answers || studentAnswers;
        const totalQuestions = activeSession.questions.length;
        
        let score = 0;
        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;

        if (activeSession.examType === "mcq") {
          activeSession.questions.forEach((q: any, idx) => {
            const userAns = answersToUse[idx];
            if (userAns === undefined || userAns === null || userAns === -1) {
              unansweredCount++;
            } else if (userAns === q.correctOption) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          });
          score = correctCount;
        } else {
          score = answersToUse.filter((ans) => typeof ans === "string" && ans.trim().length > 0).length;
          correctCount = score;
          unansweredCount = totalQuestions - score;
        }

        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        const candidateName = student?.name || studentName || "Candidate";
        const candidateEmail = student?.email || currentStudentEmail || "candidate@example.com";
        const warningsCount = student?.warnings ?? studentWarnings ?? 0;

        const getGradeBadge = (pct: number) => {
          if (pct >= 80) return { label: "Outstanding", color: "bg-success/20 text-success border-success/30" };
          if (pct >= 60) return { label: "Passed", color: "bg-primary/20 text-primary border-primary/30" };
          return { label: "Needs Improvement", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" };
        };

        const grade = getGradeBadge(percentage);

        return (
          <div className="max-w-3xl mx-auto w-full space-y-6">
            <Card className="bg-card/60 backdrop-blur-md border border-border/50 shadow-2xl overflow-hidden">
              <CardHeader className="text-center pb-4 border-b border-border/40 bg-secondary/10">
                <div className="p-3 bg-success/15 rounded-full w-fit mx-auto text-success border border-success/30 mb-2 shadow-sm">
                  <Trophy className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">Exam Results & Performance Report</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Official report generated for <strong className="text-foreground">{candidateName}</strong> ({candidateEmail})
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                
                {/* Score Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider">Final Score</span>
                    <div className="text-2xl sm:text-3xl font-black text-primary mt-1">
                      {score} <span className="text-sm font-normal text-muted-foreground">/ {totalQuestions}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/50 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Percentage</span>
                    <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                      {percentage}%
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/50 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Verdict Grade</span>
                    <span className={`mt-2 px-2.5 py-1 rounded-full text-xs font-black border uppercase ${grade.color}`}>
                      {grade.label}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/50 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Anti-Cheat Audit</span>
                    <div className="text-xs font-bold text-success flex items-center gap-1 mt-2">
                      <Shield className="w-4 h-4 text-success" />
                      {warningsCount === 0 ? "Clean (0/3)" : `${warningsCount} Warning(s)`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Performance Rating</span>
                    <span className="text-primary">{percentage}% Complete</span>
                  </div>
                  <div className="w-full h-3 bg-secondary/50 rounded-full overflow-hidden border border-border/40 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown Stats Bar */}
                {activeSession.examType === "mcq" && (
                  <div className="grid grid-cols-3 gap-3 text-xs text-center pt-1">
                    <div className="p-2.5 rounded-lg bg-success/10 border border-success/20 text-success font-bold">
                      ✓ Correct: {correctCount}
                    </div>
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-bold">
                      ✗ Incorrect: {incorrectCount}
                    </div>
                    <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/40 text-muted-foreground font-bold">
                      ? Unanswered: {unansweredCount}
                    </div>
                  </div>
                )}

                {/* Detailed Questions Review */}
                <div className="space-y-4 pt-2 text-left">
                  <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" /> Comprehensive Paper Review & Correct Answers
                    </span>
                    <span className="text-[10px] text-primary font-bold">{totalQuestions} Questions</span>
                  </div>

                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {activeSession.questions.map((q: any, idx: number) => {
                      const userAns = answersToUse[idx];

                      if (activeSession.examType === "coding") {
                        const codeWritten = typeof userAns === "string" ? userAns : "";
                        const hasCode = codeWritten.trim().length > 0;
                        return (
                          <div key={idx} className="p-4 rounded-xl border border-border/50 bg-secondary/15 space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-primary">Problem {idx + 1}: {q.text}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasCode ? "bg-success/15 text-success border border-success/30" : "bg-destructive/15 text-destructive border border-destructive/30"
                              }`}>
                                {hasCode ? "Code Submitted" : "No Code Written"}
                              </span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-xs text-slate-100 whitespace-pre overflow-x-auto">
                              {hasCode ? codeWritten : "# No submission provided for this problem"}
                            </div>
                          </div>
                        );
                      } else {
                        // MCQ Breakdown
                        const mcq = q as MCQQuestion;
                        const isCorrect = userAns === mcq.correctOption;
                        const isUnanswered = userAns === undefined || userAns === null || userAns === -1;

                        return (
                          <div key={idx} className="p-4 rounded-xl border border-border/50 bg-secondary/15 space-y-3 text-xs">
                            <div className="font-bold flex items-start justify-between gap-2">
                              <span className="text-foreground leading-relaxed">Q{idx + 1}. {mcq.text}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                isCorrect ? "bg-success/20 text-success border border-success/30" :
                                isUnanswered ? "bg-secondary text-muted-foreground border border-border" :
                                "bg-destructive/20 text-destructive border border-destructive/30"
                              }`}>
                                {isCorrect ? "✓ CORRECT" : isUnanswered ? "NOT ANSWERED" : "✗ INCORRECT"}
                              </span>
                            </div>

                            {/* Options List */}
                            <div className="space-y-1.5 pt-1">
                              {mcq.options.map((option: string, optIdx: number) => {
                                const isUserSelected = userAns === optIdx;
                                const isRightAnswer = mcq.correctOption === optIdx;

                                let optionStyle = "bg-card/50 border-border/40 text-muted-foreground";
                                if (isRightAnswer) {
                                  optionStyle = "bg-success/15 border-success/40 text-success font-bold";
                                } else if (isUserSelected && !isRightAnswer) {
                                  optionStyle = "bg-destructive/15 border-destructive/40 text-destructive font-bold";
                                }

                                return (
                                  <div key={optIdx} className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${optionStyle}`}>
                                    <span>{option}</span>
                                    {isRightAnswer && <CheckCircle className="w-4 h-4 text-success shrink-0" />}
                                    {isUserSelected && !isRightAnswer && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>

              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40 bg-secondary/10">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-1/2 font-semibold" 
                  onClick={() => window.print()}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Save / Print Result Report
                </Button>
                <Button 
                  className="w-full sm:w-1/2 font-semibold" 
                  onClick={() => setMode("select")}
                >
                  Return to Exam Area <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      })()}

    </div>
  );
};

export default ExamArea;
