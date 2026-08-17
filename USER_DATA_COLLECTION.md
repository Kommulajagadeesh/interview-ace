# Smart Interview AI - User Data Collection & Privacy Specifications

This document outlines all categories of data collected, processed, and stored by the **Smart Interview AI & Anti-Cheat Examination System**.

---

## 📋 Data Collection Overview

The system collects data across **5 primary categories**:
1. **Personal Identity & Account Data**
2. **Profile & Resume Data**
3. **Biometric & Computer Vision Data**
4. **Examination Telemetry & Submissions**
5. **Invigilator Audit & Security Logs**

---

## 1. 👤 Personal Identity & Account Data

Collected during **Sign Up**, **Login**, and **Email Verification**.

| Data Field | Data Type | Mandatory | Purpose & Description |
| :--- | :--- | :---: | :--- |
| **Full Name** | `string` | Yes | Identity verification on exam certificates and Invigilator Dashboard. |
| **Email Address** | `string` | Yes | Unique account identifier & mandatory email verification recipient. |
| **Password** | `string` (Hashed) | Yes | Account authentication credentials (securely stored). |
| **Email Verification Status** | `boolean` | Yes | Mandatory sign-up verification check (`isEmailVerified`). |
| **User Role** | `enum` | Yes | Access privileges (`"student"` or `"admin"`). |
| **Account Creation Timestamp** | `ISO Date` | Yes | Account audit and registration history tracking. |

---

## 2. 📄 Profile & Resume Data

Collected during **Profile Setup** and candidate onboarding.

| Data Field | Data Type | Mandatory | Purpose & Description |
| :--- | :--- | :---: | :--- |
| **Phone Number** | `string` | Optional | Candidate contact details for interview notifications. |
| **Education Details** | `string` | Yes | Degree, university name, and graduation year. |
| **Target Role & Experience** | `string` | Yes | Position applied for and years of experience. |
| **Technical Skills** | `string[]` | Yes | Programming languages and framework proficiencies. |
| **Resume Document** | `PDF / TXT` | Optional | Uploaded resume file processed via PDF.js text extractor. |
| **Extracted Resume Text** | `string` | Optional | Contextual text parsed from PDF resume for AI interview customization. |
| **Selfie Photo ID** | `base64 image` | Yes | Baseline photo ID registered before entering examination room. |

---

## 3. 🔬 Biometric & Computer Vision Data

Captured live via webcam during **AI Profile Enrollment** and **Live Exam Area Monitoring**.

| Data Field | Data Type | Mandatory | Purpose & Description |
| :--- | :--- | :---: | :--- |
| **Selfie Perceptual Hash** | `string (64-bit)` | Yes | Unique numerical hash representing facial feature matrix. |
| **Facial Keypoint Landmarks** | `array[6]` | Yes | Coordinate tracking points (Right Eye, Left Eye, Nose, Mouth Corners). |
| **Eye Contact Ratio** | `float` | Yes | Gaze ratio tracking (`[0.32, 0.68]` valid screen range). |
| **Pose & Posture Score** | `integer (0-100)` | Yes | Head movement and posture alignment tracking score. |
| **CV Match Percentage** | `float (0-100%)` | Yes | Real-time Computer Vision similarity index against reference selfie. |
| **Violation Snapshot Images** | `base64 image[]` | Conditional | Captured camera pictures generated at exact moment of cheat violations. |
| **Latest Violation Photo** | `base64 image` | Conditional | Most recent violation picture displayed on Invigilator Dashboard. |
| **Latest Violation Reason** | `string` | Conditional | Description of violation (e.g. *"Head turned / looked away"*). |

---

## 4. 📝 Examination Telemetry & Submissions

Recorded in real-time during **Live Candidate Examination Sessions**.

| Data Field | Data Type | Mandatory | Purpose & Description |
| :--- | :--- | :---: | :--- |
| **Exam Room ID** | `string` | Yes | Unique session code connecting candidate paper to Invigilator Panel. |
| **Current Question Index** | `integer` | Yes | Active question candidate is currently viewing/answering. |
| **MCQ Selected Answers** | `integer[]` | Yes | Selected option indexes (`0`, `1`, `2`, `3`) for multiple choice questions. |
| **Coding Submissions** | `string[]` | Yes | Code written by candidate for live coding questions. |
| **Anti-Cheat Warning Count**| `integer (0-4)` | Yes | Accumulated warnings count (`1/3`, `2/3`, `3/3`, `4th auto-finish`). |
| **Session Lock Status** | `enum` | Yes | Active state (`"active"`, `"locked"`, `"submitted"`). |
| **Final Score & Percentage** | `float` | Yes | Computed score upon exam submission. |

---

## 5. 🛡️ Invigilator Audit & Security Logs

Generated automatically for **Anti-Cheat Compliance & Admin Inspection**.

| Log Field | Data Type | Purpose & Description |
| :--- | :--- | :--- |
| **Timestamp** | `string` | Exact local time event occurred (e.g. `14:32:05`). |
| **Event Message** | `string` | Detailed event log (e.g. *"Anti-cheat violation 2/3: Candidate turned head"*). |
| **Event Type** | `enum` | Event severity category (`"info"`, `"warning"`, `"error"`). |
| **Snapshot URL** | `string` | Linked violation camera image for invigilator visual audit. |

---

## 🔒 Data Security & Privacy Policies

1. **Client-Side Face Feature Processing**:
   - Computer Vision feature hashing and landmark detection run locally in the browser via TensorFlow.js (`blazeface`).
   - Facial feature data is stored as non-reconstructible perceptual hashes.

2. **Mandatory Verification**:
   - Mandatory email verification ensures identity validity before exam room entry.

3. **Invigilator Visual Transparency**:
   - Violation snapshot pictures are visible only to authorized Invigilators/Admins on the session inspection dashboard to prevent false cheating accusations.

---

*Document Generated for Smart Interview AI System Specifications.*
