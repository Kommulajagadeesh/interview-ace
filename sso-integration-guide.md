# Single Sign-On (SSO) & Cross-Firebase Integration Guide

This guide explains how to implement seamless **Auto-Login** for candidates redirecting from your main website to the **Exam Area**, and how to share or synchronize data between two different Firebase projects.

---

## 1. How to Implement Auto-Login (SSO) via URL Redirection

You can configure the **Exam Area** to bypass the manual Student Login form if credentials are passed securely via URL query parameters when a student is redirected from your main website.

### Step A: Redirection URL Generation (On Main Website)
When a logged-in student clicks "Start Exam" on your main website, redirect them using this URL format:
```
https://your-exam-domain.com/exam-area?room=479739&name=Abhi&email=candidate@gmail.com&token=SECURE_HMAC_SIGNATURE
```

### Step B: URL Parameter Parsing & Auto-Login (In ExamArea.tsx)
Add an `useEffect` hook in `ExamArea.tsx` to read the search parameters upon page load and trigger the join workflow automatically:

```typescript
useEffect(() => {
  const queryParams = new URLSearchParams(window.location.search);
  const urlRoomId = queryParams.get("room");
  const urlName = queryParams.get("name");
  const urlEmail = queryParams.get("email");
  const urlToken = queryParams.get("token"); // Optional: for security signatures

  if (urlRoomId && urlName && urlEmail) {
    // 1. Autofill form states
    setStudentRoomId(urlRoomId);
    setStudentName(urlName);
    setStudentEmail(urlEmail);
    
    // 2. Trigger student join programmatically
    autoJoinStudent(urlRoomId, urlName, urlEmail);
  }
}, []);

const autoJoinStudent = async (roomId: string, name: string, email: string) => {
  let formattedRoomId = roomId.trim().toUpperCase();
  if (/^\d{6}$/.test(formattedRoomId)) {
    formattedRoomId = "EXAM-" + formattedRoomId;
  }

  try {
    const sessionDoc = await getDoc(doc(db, "examSessions", formattedRoomId));
    if (!sessionDoc.exists()) {
      toast.error("SSO Error: Exam Room not found.");
      return;
    }
    const sessionData = sessionDoc.data() as any;
    const emailKey = email.trim().toLowerCase();

    // Setup initial answer array and initialize the session
    const initialAnswers = sessionData.questions.map((q: any) => 
      sessionData.examType === "coding" ? q.initialCode : -1
    );

    const record = {
      name,
      email: emailKey,
      currentIndex: 0,
      answers: initialAnswers,
      warnings: 0,
      status: "active" as const,
      logs: [{ timestamp: new Date().toLocaleTimeString(), message: "Auto-logged in via Single Sign-On", type: "info" as const }]
    };

    await setDoc(doc(db, "examSessions", formattedRoomId, "students", emailKey), record);
    
    setActiveSession({ ...sessionData, examRoomId: formattedRoomId, students: { [emailKey]: record } });
    setCurrentStudentEmail(emailKey);
    setStudentAnswers(initialAnswers);
    setStudentWarnings(0);
    setStudentLogs(record.logs);
    setStudentCurrentIndex(0);
    setExamTimeLeft(sessionData.duration * 60);
    
    // Redirect candidate directly to rules agreement page (skips login form!)
    setMode("student_rules");
    toast.success(`Welcome back, ${name}! Auto-logged in successfully.`);
  } catch (err) {
    console.error("SSO Auto-Join Failed:", err);
  }
};
```

---

## 2. Sharing Data Between Two Different Firebase Projects

If your main website is hosted on **Firebase Project A** and the Exam Area is hosted on **Firebase Project B**, here are the three architectural approaches you can take:

### Approach A: Shared Database Instance (Recommended)
You do not need two separate projects. Firebase allows multiple independent web applications (e.g., `main-portal.com` and `exam-portal.com`) to communicate with the **same Firestore instance**. 
* Keep all exam, student registry, and result records in one Firebase project.
* Initialize the same Firebase configuration parameters in the code of both React repositories.

---

### Approach B: Multiple Firebase App Instances in React
If you must keep separate Firebase projects, you can initialize both configurations in the Exam Area React app:

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Project B (Exam Portal Config - Default)
const examConfig = {
  apiKey: "...",
  projectId: "project-exam-b",
  // ...
};
const examApp = initializeApp(examConfig);
export const db = getFirestore(examApp); // Exam database

// Firebase Project A (Main Portal Config - Secondary)
const mainPortalConfig = {
  apiKey: "...",
  projectId: "project-main-a",
  // ...
};
const mainApp = initializeApp(mainPortalConfig, "mainPortalInstance");
export const mainDb = getFirestore(mainApp); // Access Main Site database directly!
```
* **Pros**: You can write student scores directly to Project A's Firestore database upon exam submission, while reading questions from Project B.
* **Cons**: Exposes Project A configuration keys to the Exam Portal repository.

---

### Approach C: Cloud Functions Secure API Bridge
Create a secure HTTPS Firebase Cloud Function on **Project B** that receives result payloads and updates **Project A**:

```javascript
// On Project B Cloud Functions
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

exports.onExamSubmitted = functions.firestore
  .document("examSessions/{roomId}/students/{email}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    
    // Trigger when student submits
    if (newData.status === "submitted") {
      // Post result securely to Project A's endpoint with a secret handshake token
      await axios.post("https://project-a-api.com/update-score", {
        email: newData.email,
        score: calculateScore(newData.answers),
        secretToken: "SHARED_SECURITY_PASSPHRASE"
      });
    }
  });
```
* **Pros**: Decouples both codebases completely. No configuration credentials are leaked between repos.
* **Cons**: Requires setting up Node.js serverless functions.
