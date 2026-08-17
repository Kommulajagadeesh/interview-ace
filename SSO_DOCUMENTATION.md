# SSO Developer Integration Guide: LearnLoop & Interview Portal

This document serves as the technical specification and implementation prompt for the developer of the **Interview Website** to enable Single Sign-On (SSO) and database activity syncing with the **LearnLoop** core platform.

---

## 1. SSO Flow Overview

LearnLoop uses a secure, serverless, database-mediated handshake protocol. Client applications do not directly share session cookies or user passwords. Instead, authentication state is negotiated via a short-lived, one-time-use token written directly into the partner app's database.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant Core as LearnLoop Core Platform
    participant DB as Interview App Firestore
    participant Partner as Interview Website

    Student->>Core: Clicks "Launch Prep Arena"
    Note over Core: Fetch student profile details<br/>(Name, Roll No, Resume URL, etc.)
    Core->>DB: Write token document to "sso_tokens" collection<br/>(Expires in 5 mins)
    Core->>Student: Open new tab redirecting to Interview Website<br/>with ?sso_token=TOKEN_ID
    Student->>Partner: Enters site with ?sso_token=TOKEN_ID in URL
    Partner->>DB: Query "sso_tokens" collection for TOKEN_ID
    DB-->>Partner: Returns token document with student details
    Note over Partner: Verify exists & not expired
    Partner->>DB: Delete TOKEN_ID document (Prevents Replay)
    Note over Partner: Establish session in sessionStorage
    Partner->>DB: Log activity ("Authenticated via SSO")
    Partner-->>Student: Renders Interview Portal (Logged in, no credentials required)
```

---

## 2. Database Integration Details

The Interview Portal must share a Firebase project (or a specific Firestore database instance) with LearnLoop. The environment configuration keys for this shared project are specified in Section 4.

### 2.1. Handshake Schema (`sso_tokens` collection)
Before redirecting the student, LearnLoop will write a document into the `sso_tokens` collection of the Interview Portal's Firestore database. 

**Document Path**: `sso_tokens/{tokenId}` (where `{tokenId}` is an auto-generated Document ID).

#### Document Fields:
| Field Name | Type | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `tokenId` | `string` | The unique token ID (matching the document ID). | `"v8A9k3f91jLs2"` |
| `uid` | `string` | The student's unique ID from LearnLoop. | `"auth_uid_12345"` |
| `fullName` | `string` | The student's full name. | `"John Doe"` |
| `email` | `string` | The student's email address. | `"student@college.edu"` |
| `phone` | `string` | The student's phone number. | `"9876543210"` |
| `rollNo` | `string` | The student's academic roll number. | `"21A91A0501"` |
| `collegeName` | `string` | The student's college name. | `"Aditya Engineering College"` |
| `btechYear` | `string` | The student's current year of study. | `"4th Year"` |
| `resumeUrl` | `string` | The Cloudflare R2 bucket download link for their resume. | `"https://pub-ed3.dev/1723_resume.pdf"` |
| `resumeScore` | `number \| null` | The parsed/evaluated score of the student's resume. | `85` |
| `createdAt` | `string` | ISO timestamp indicating when the token was generated. | `"2026-08-17T12:00:00.000Z"` |
| `expiresAt` | `string` | ISO timestamp after which the token is invalid (5 mins). | `"2026-08-17T12:05:00.000Z"` |

---

## 3. Implementation Code (For Interview Website)

The following reference implementation shows how the Interview Website should handle page loading, validate the `sso_token`, delete the token to prevent replay attacks, and persist the student session locally.

### 3.1. Handshake Validation Handler (React Example)

```javascript
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';

// 1. Helper to safely resolve environment variables across Vite (import.meta.env)
// and Webpack/Create React App/Next.js (process.env)
const getEnvVal = (key) => {
  // Vite environment resolution
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key];
  }
  // Process environment resolution (Webpack, CRA, Next.js, Node)
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[key] ||
      process.env[`VITE_${key}`] ||
      process.env[`REACT_APP_${key}`] ||
      process.env[`NEXT_PUBLIC_${key}`]
    );
  }
  return '';
};

// 2. Initialize Firebase with the shared Interview Area credentials
const firebaseConfig = {
  apiKey: getEnvVal('FIREBASE_API_KEY'),
  authDomain: getEnvVal('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVal('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVal('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVal('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVal('FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const InterviewPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ssoUser, setSsoUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleSSOHandshake = async () => {
      // Step A: Check if a valid session already exists in browser storage
      const storedSession = sessionStorage.getItem('interview_sso_session');
      if (storedSession) {
        try {
          setSsoUser(JSON.parse(storedSession));
          setLoading(false);
          return;
        } catch (e) {
          sessionStorage.removeItem('interview_sso_session');
        }
      }

      // Step B: Check for sso_token in the URL query string
      const ssoToken = searchParams.get('sso_token');
      if (!ssoToken) {
        setErrorMsg('Unauthorized access. Please open the Interview Portal from the LearnLoop core platform.');
        setLoading(false);
        return;
      }

      try {
        // Step C: Query Firestore for the token document
        const tokenDocRef = doc(db, "sso_tokens", ssoToken);
        const tokenSnap = await getDoc(tokenDocRef);

        if (!tokenSnap.exists()) {
          setErrorMsg('Invalid or expired SSO token. Please re-authenticate from LearnLoop.');
          setLoading(false);
          return;
        }

        const tokenData = tokenSnap.data();
        const now = new Date();
        const expiresAt = new Date(tokenData.expiresAt);

        // Step D: Verify token expiration
        if (now > expiresAt) {
          setErrorMsg('SSO token has expired (5-minute limit exceeded). Please try again.');
          await deleteDoc(tokenDocRef); // Clean up expired token
          setLoading(false);
          return;
        }

        // Step E: Extract student profile data
        const studentProfile = {
          uid: tokenData.uid,
          fullName: tokenData.fullName,
          email: tokenData.email,
          phone: tokenData.phone,
          rollNo: tokenData.rollNo,
          collegeName: tokenData.collegeName,
          btechYear: tokenData.btechYear,
          resumeUrl: tokenData.resumeUrl,
          resumeScore: tokenData.resumeScore
        };

        // Step F: One-Time Use Restriction - Immediately delete token from DB
        await deleteDoc(tokenDocRef);

        // Step G: Save to local state and session storage
        setSsoUser(studentProfile);
        sessionStorage.setItem('interview_sso_session', JSON.stringify(studentProfile));

        // Step H: Clean URL by removing the sso_token from query parameters
        searchParams.delete('sso_token');
        setSearchParams(searchParams);

        // Step I: Log Authentication Activity back to Firestore
        await addDoc(collection(db, "partner_activities"), {
          uid: studentProfile.uid,
          userFullName: studentProfile.fullName,
          userEmail: studentProfile.email,
          app: "Interview Portal",
          action: "Authenticated via SSO",
          details: `Logged in using SSO handshake. Roll Number: ${studentProfile.rollNo}.`,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        console.error("SSO verification error:", err);
        setErrorMsg('An error occurred during secure authentication.');
      } finally {
        setLoading(false);
      }
    };

    handleSSOHandshake();
  }, [searchParams, setSearchParams]);

  if (loading) return <div>Establishing secure connection...</div>;
  if (errorMsg) return <div>Access Denied: {errorMsg}</div>;

  return (
    <div>
      <h1>Welcome to the Interview, {ssoUser.fullName}!</h1>
      <p>Roll Number: {ssoUser.rollNo}</p>
      <p>College: {ssoUser.collegeName}</p>
      {ssoUser.resumeUrl && <a href={ssoUser.resumeUrl} target="_blank" rel="noreferrer">Download Resume</a>}
      {/* RENDER THE INTERVIEW FORM & FLOW HERE */}
    </div>
  );
};
```

---

### 3.2. Syncing Post-Interview Scores & Progress

Whenever a student makes progress (e.g. completes an interview, receives feedback, or achieves a mock score), the Interview Website should record an activity inside the shared Firestore. This allows the LearnLoop dashboard to fetch and present the telemetry feed in real time.

```javascript
import { addDoc, collection } from 'firebase/firestore';

/**
 * Logs user achievements or submissions back to the shared activities stream.
 */
export const logInterviewActivity = async (studentProfile, action, details) => {
  try {
    await addDoc(collection(db, "partner_activities"), {
      uid: studentProfile.uid,
      userFullName: studentProfile.fullName,
      userEmail: studentProfile.email,
      app: "Interview Portal",
      action: action, // e.g. "Completed Mock Technical Interview"
      details: details, // e.g. "Achieved score of 88% with feedback: strong recursion logic."
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
```

---

## 4. Required Environment Configurations

Both teams must align on the environment keys. Below are the configurations for both sides.

### 4.1. For the Interview Website Developer (Their Side)
Depending on the framework you are using to build the Interview Website, copy the corresponding block of environment variables into your `.env` configuration file.

#### Option A: If your project uses Vite (React + Vite, Vue + Vite, Svelte, etc.)
Vite loads variables starting with `VITE_` and exposes them via `import.meta.env.VITE_...`:
```env
VITE_FIREBASE_API_KEY="AIzaSyDgO-ylsdggyrmlN5n1ylsKBUJdrUY939E"
VITE_FIREBASE_AUTH_DOMAIN="smart-ai-interview-5249e.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="smart-ai-interview-5249e"
VITE_FIREBASE_STORAGE_BUCKET="smart-ai-interview-5249e.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="281265182713"
VITE_FIREBASE_APP_ID="1:281265182713:web:8281db9539a5a7ac774f28"
```

#### Option B: If your project uses Create React App / Webpack (CRA)
Webpack/CRA loads variables starting with `REACT_APP_` and exposes them via `process.env.REACT_APP_...`:
```env
REACT_APP_FIREBASE_API_KEY="AIzaSyDgO-ylsdggyrmlN5n1ylsKBUJdrUY939E"
REACT_APP_FIREBASE_AUTH_DOMAIN="smart-ai-interview-5249e.firebaseapp.com"
REACT_APP_FIREBASE_PROJECT_ID="smart-ai-interview-5249e"
REACT_APP_FIREBASE_STORAGE_BUCKET="smart-ai-interview-5249e.firebasestorage.app"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="281265182713"
REACT_APP_FIREBASE_APP_ID="1:281265182713:web:8281db9539a5a7ac774f28"
```

#### Option C: If your project uses Next.js
Next.js loads client-exposed variables starting with `NEXT_PUBLIC_` and exposes them via `process.env.NEXT_PUBLIC_...`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyDgO-ylsdggyrmlN5n1ylsKBUJdrUY939E"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="smart-ai-interview-5249e.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="smart-ai-interview-5249e"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="smart-ai-interview-5249e.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="281265182713"
NEXT_PUBLIC_FIREBASE_APP_ID="1:281265182713:web:8281db9539a5a7ac774f28"
```

#### Option D: If your project is a Node.js Backend or Standard JS
Standard environments load keys with no prefix and expose them via `process.env.`:
```env
FIREBASE_API_KEY="AIzaSyDgO-ylsdggyrmlN5n1ylsKBUJdrUY939E"
FIREBASE_AUTH_DOMAIN="smart-ai-interview-5249e.firebaseapp.com"
FIREBASE_PROJECT_ID="smart-ai-interview-5249e"
FIREBASE_STORAGE_BUCKET="smart-ai-interview-5249e.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="281265182713"
FIREBASE_APP_ID="1:281265182713:web:8281db9539a5a7ac774f28"
```

### 4.2. For LearnLoop (Our Side)
LearnLoop matches these credentials and targets your deployed website URL with the routing variables:
```env
VITE_INTERVIEW_FIREBASE_API_KEY="AIzaSyDgO-ylsdggyrmlN5n1ylsKBUJdrUY939E"
VITE_INTERVIEW_FIREBASE_AUTH_DOMAIN="smart-ai-interview-5249e.firebaseapp.com"
VITE_INTERVIEW_FIREBASE_PROJECT_ID="smart-ai-interview-5249e"
VITE_INTERVIEW_FIREBASE_STORAGE_BUCKET="smart-ai-interview-5249e.firebasestorage.app"
VITE_INTERVIEW_FIREBASE_MESSAGING_SENDER_ID="281265182713"
VITE_INTERVIEW_FIREBASE_APP_ID="1:281265182713:web:8281db9539a5a7ac774f28"

# Redirect Destination (URL of the deployed Interview Portal)
VITE_INTERVIEW_APP_URL="https://smart-ai-interview-5249e.web.app"
```

---

## 5. Security Summary
- **No Long-Lived Secrets**: Client applications do not share cookies or credentials.
- **Strict Expiration**: Tokens expire within 5 minutes, mitigating reuse of copied URLs.
- **Immediate Deletion**: The one-time token deletion on successful handshake prevents replay attacks.
- **Separate Sandbox Routing**: `gameZoneDb` and `interviewDb` remain isolated databases to prevent cross-contamination of student data or configuration schemas.
- **Local Session Management**: Using browser `sessionStorage` ensures credentials are wiped once the tab/browser is closed.
