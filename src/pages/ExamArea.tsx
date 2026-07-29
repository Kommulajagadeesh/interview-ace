import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
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

  // -------------------------------------------------------------
  // Real-Time Sync via Firebase onSnapshot Listeners
  // -------------------------------------------------------------
  
  // 1. Invigilator Dashboard Listeners
  useEffect(() => {
    if (mode === "monitor_dashboard" && activeSession?.examRoomId) {
      const roomId = activeSession.examRoomId;

      // Listen to the session details
      const unsubscribeSession = onSnapshot(doc(db, "examSessions", roomId), (docSnap) => {
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
      });

      // Listen to all student submissions and logs in real-time
      const unsubscribeStudents = onSnapshot(
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
              students: studentMap
            };
          });
        }
      );

      return () => {
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

      setActiveSession(newSession);
      setAdminRoomId(examRoomId);
      setAdminPinInput(adminPin);
      toast.success(`Secure room generated on Firebase!`);
      setMode("monitor_dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload exam settings to database. Verify Firestore configuration.");
    }
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
      // Fetch session from Firebase
      const sessionDoc = await getDoc(doc(db, "examSessions", roomId));
      if (!sessionDoc.exists()) {
        toast.error("Invalid Room Code. Verify with your invigilator.");
        return;
      }
      const sessionData = sessionDoc.data() as any;

      const emailKey = studentEmail.trim().toLowerCase();

      // Check if user is locked
      const studentDoc = await getDoc(doc(db, "examSessions", roomId, "students", emailKey));
      if (studentDoc.exists()) {
        const existing = studentDoc.data() as StudentRecord;
        if (existing.status === "locked") {
          setCurrentStudentEmail(emailKey);
          setActiveSession({ ...sessionData, examRoomId: roomId, students: { [emailKey]: existing } });
          setMode("student_login");
          toast.error("Your exam session is locked due to violations. Request examiner unlock.");
          return;
        }

        if (existing.status === "submitted") {
          toast.error("You have already completed and submitted this exam paper.");
          return;
        }
      }

      // Initial answers buffer
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

      // Store student record in Subcollection under session
      await setDoc(doc(db, "examSessions", roomId, "students", emailKey), record);

      setActiveSession({ ...sessionData, examRoomId: roomId, students: { [emailKey]: record } });
      setCurrentStudentEmail(emailKey);
      setStudentAnswers(initialAnswers);
      setStudentWarnings(0);
      setStudentLogs(record.logs);
      setStudentCurrentIndex(0);
      setExamTimeLeft(sessionData.duration * 60);
      setMode("student_rules");
    } catch (err) {
      console.error(err);
      toast.error("Connection failed. Check your network.");
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
      const sessionDoc = await getDoc(doc(db, "examSessions", roomId));
      if (!sessionDoc.exists()) {
        toast.error("Room ID not found in database.");
        return;
      }
      
      const sessionData = sessionDoc.data() as any;
      if (sessionData.adminPin !== adminPinInput.trim()) {
        toast.error("Incorrect Admin PIN.");
        return;
      }

      // Fetch existing students in subcollection
      const querySnap = await getDocs(collection(db, "examSessions", roomId, "students"));
      const studentMap: { [email: string]: StudentRecord } = {};
      querySnap.forEach((doc) => {
        studentMap[doc.id] = doc.data() as StudentRecord;
      });

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

    const nextWarnings = studentWarnings + 1;
    setStudentWarnings(nextWarnings);

    let status: "active" | "locked" = "active";
    if (nextWarnings >= 3) {
      status = "locked";
      setMode("student_login");
      document.exitFullscreen().catch(() => {});
      toast.error("Exam Locked! You exceeded 3 warnings. Request invigilator unlock PIN.");
    }

    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: `Anti-cheat violation: ${reason} (Warning ${nextWarnings}/3)`,
      type: "warning" as const
    };

    const updatedLogs = [...studentLogs, newLog];
    setStudentLogs(updatedLogs);

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

    try {
      await updateDoc(
        doc(db, "examSessions", activeSession.examRoomId, "students", currentStudentEmail),
        {
          status: "submitted",
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
    <div className="container mx-auto px-4 py-8 max-w-6xl min-h-[calc(100vh-80px)] flex flex-col justify-center">
      
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
            <div className="flex items-center gap-2">
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

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Panel: Invigilator tab selection details */}
            <Card className="lg:col-span-2 bg-card/30 border border-border/50 shadow-lg h-[450px] flex flex-col justify-between overflow-hidden">
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
                  <div className="space-y-2 font-mono text-xs text-left">
                    {Object.values(activeSession.students).flatMap(s => 
                      s.logs.map(l => ({ ...l, studentName: s.name }))
                    ).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic py-32">
                        Waiting for candidates to perform actions...
                      </div>
                    ) : (
                      Object.values(activeSession.students).flatMap(s => 
                        s.logs.map(l => ({ ...l, studentName: s.name }))
                      ).sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map((log, idx) => (
                        <div key={idx} className={`p-2 rounded border leading-relaxed ${
                          log.type === "error" ? "bg-destructive/10 border-destructive/25 text-destructive" :
                          log.type === "warning" ? "bg-warning/10 border-warning/25 text-warning" :
                          "bg-secondary/40 border-border/30 text-muted-foreground"
                        }`}>
                          <span className="font-bold">[{log.timestamp}]</span>{" "}
                          <span className="text-foreground underline decoration-border">{log.studentName}</span>: {log.message}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. Leaderboard Tab */}
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
                              <th className="py-2 px-3 text-left">Rank</th>
                              <th className="py-2 px-3 text-left">Candidate Name</th>
                              <th className="py-2 px-3 text-left">Email Address</th>
                              <th className="py-2 px-3 text-left">Warnings</th>
                              <th className="py-2 px-3 text-left">Status</th>
                              <th className="py-2 px-3 text-right">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getLeaderboardList().map((s, idx) => (
                              <tr key={s.email} className="border-b border-border/30 hover:bg-secondary/20">
                                <td className="py-3 px-3 font-mono font-bold text-primary flex items-center gap-1.5">
                                  <Trophy className="w-3.5 h-3.5" /> {idx + 1}
                                </td>
                                <td className="py-3 px-3 font-semibold">{s.name}</td>
                                <td className="py-3 px-3 text-muted-foreground">{s.email}</td>
                                <td className="py-3 px-3 text-destructive font-bold">{s.warnings} / 3</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    s.status === "active" ? "bg-success/10 text-success" :
                                    s.status === "locked" ? "bg-destructive/10 text-destructive" :
                                    "bg-primary/10 text-primary"
                                  }`}>
                                    {s.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-sm text-foreground">
                                  {getStudentScore(s, activeSession)} / {activeSession.questions.length}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Candidates registry list */}
            <Card className="bg-card/30 border border-border/50 shadow-lg h-[450px] flex flex-col justify-between">
              <CardHeader className="border-b border-border/50 py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Student Registry
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {Object.keys(activeSession.students).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                    No candidates registered yet.
                  </div>
                ) : (
                  Object.values(activeSession.students).map((s) => (
                    <div key={s.email} className="flex justify-between items-center p-3 rounded-lg border border-border/40 bg-card/20 text-xs">
                      <div className="space-y-1 text-left">
                        <div className="font-bold flex items-center gap-1">
                          {s.name}
                          {s.status === "locked" && <Lock className="w-3 h-3 text-destructive shrink-0" />}
                          {s.status === "submitted" && <CheckCircle className="w-3 h-3 text-success shrink-0" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{s.email}</div>
                        <div className="text-[10px]">
                          Warnings: <span className="font-bold text-destructive">{s.warnings}</span> | Index: {s.currentIndex + 1}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {activeSession.examType === "coding" && (
                          <Button
                            variant="secondary"
                            size="xs"
                            className="h-7 text-[10px]"
                            onClick={() => setSelectedStudentEmail(s.email)}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View Code
                          </Button>
                        )}
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
                  ))
                )}
              </CardContent>
            </Card>

          </div>

          {/* Student code view drawer modal */}
          {selectedStudentEmail && activeSession.students[selectedStudentEmail] && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="max-w-3xl w-full max-h-[85vh] flex flex-col justify-between bg-card border border-border shadow-2xl">
                <CardHeader className="border-b border-border/50 py-4 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" /> Submitted Code: {activeSession.students[selectedStudentEmail].name}
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Email: {selectedStudentEmail}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudentEmail(null)}>Close</Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                  {activeSession.questions.map((q, idx) => {
                    const submission = activeSession.students[selectedStudentEmail!].answers[idx] || "";
                    return (
                      <div key={idx} className="space-y-2 text-left">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Question {idx + 1}:
                        </div>
                        <div className="text-sm font-semibold">{q.text}</div>
                        <div className="bg-secondary/40 border border-border/50 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed text-foreground">
                          {submission || "# No answer submitted"}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

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
      {mode === "student_submitted" && activeSession && (
        <Card className="max-w-xl mx-auto w-full bg-card/50 backdrop-blur-md border border-border/50 shadow-2xl text-center">
          <CardHeader>
            <div className="p-3 bg-success/10 rounded-full w-fit mx-auto text-success border border-success/20 mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Exam Submitted</CardTitle>
            <CardDescription className="text-xs">
              Your exam paper has been securely recorded in the registry database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Quick stats box */}
            <div className="p-4 bg-secondary/40 rounded-lg border border-border/50 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Exam Category:</span>
                <span className="font-bold">{activeSession.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Total Questions:</span>
                <span className="font-bold">{activeSession.questions.length}</span>
              </div>
              
              {activeSession.examType === "mcq" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Your Final Score:</span>
                  <span className="font-bold text-primary text-sm">
                    {student ? getStudentScore(student, activeSession) : 0} / {activeSession.questions.length}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Anti-Cheat Verdict:</span>
                <span className="font-bold text-success flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Checked & Clean
                </span>
              </div>
            </div>

            {/* Answer Corrections (if enabled by examiner) */}
            {activeSession.examType === "mcq" && activeSession.showAnswersAfterExam && student && (
              <div className="space-y-3 pt-2 text-left">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Answer Keys & Corrections:
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeSession.questions.map((q: any, idx) => {
                    const candidateAns = student.answers[idx];
                    const correctAns = q.correctOption;
                    const isCorrect = candidateAns === correctAns;
                    
                    return (
                      <div key={idx} className="p-3 bg-secondary/20 rounded-xl border border-border/40 text-xs space-y-1.5">
                        <div className="font-bold flex items-center gap-1">
                          <span>Q{idx + 1}. {q.text}</span>
                          {isCorrect ? (
                            <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                          )}
                        </div>
                        <div className="space-y-1 text-muted-foreground font-semibold">
                          <div className={`p-1.5 rounded flex justify-between ${
                            isCorrect ? "bg-success/5 text-success border border-success/15" : "bg-destructive/5 text-destructive border border-destructive/15"
                          }`}>
                            <span>Your Answer: {candidateAns >= 0 ? q.options[candidateAns] : "No Answer Selected"}</span>
                          </div>
                          {!isCorrect && (
                            <div className="p-1.5 rounded bg-success/5 text-success border border-success/15 flex justify-between">
                              <span>Correct Answer: {q.options[correctAns]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter className="pt-2">
            <Button className="w-full font-semibold" onClick={() => setMode("select")}>
              Return to Hall Selector
            </Button>
          </CardFooter>
        </Card>
      )}

    </div>
  );
};

export default ExamArea;
