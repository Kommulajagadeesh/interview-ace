import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  ArrowLeft,
  ArrowRight,
  Check,
  Code,
  Globe,
  Database,
  Cpu,
  Wifi,
  Briefcase,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Camera,
  Upload,
  Trash,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  isProfileSetupComplete,
  saveUserProfile,
  getUserProfile,
  getCurrentUserEmail,
  syncProfileFromDatabase,
  type UserProfile,
} from "@/lib/auth";

const learningProgramsList = [
  { id: "dsa", label: "DSA Foundations", icon: Code, desc: "Algorithms & complexity" },
  { id: "web", label: "Web Development", icon: Globe, desc: "HTML/CSS, JS & React" },
  { id: "dbms", label: "Database Systems", icon: Database, desc: "SQL & schema design" },
  { id: "os", label: "Operating Systems", icon: Cpu, desc: "Scheduling & memory" },
  { id: "networking", label: "Computer Networks", icon: Wifi, desc: "Protocols & internet" },
  { id: "hr", label: "HR & Behavioral", icon: Briefcase, desc: "STAR answering method" },
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const email = getCurrentUserEmail() || "";

  // Page States (1: Details, 2: Review)
  const [step, setStep] = useState<1 | 2>(1);
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    gender: "",
    learningPrograms: [] as string[],
    resumeFileName: "",
    resumeText: "",
    profilePhoto: "",
  });

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      toast.error("Could not access camera. Please upload a photo instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPersonalDetails((prev) => ({
        ...prev,
        profilePhoto: dataUrl,
      }));
      toast.success("Selfie captured!");
      stopCamera();
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Load existing profile if editing
  useEffect(() => {
    const existingProfile = getUserProfile();
    const existingSelfie = sessionStorage.getItem(`interviewSelfie_${email.trim().toLowerCase()}`);
    if (existingProfile) {
      setPersonalDetails({
        name: existingProfile.name,
        gender: existingProfile.gender,
        learningPrograms: existingProfile.learningPrograms,
        resumeFileName: existingProfile.resumeFileName || "",
        resumeText: existingProfile.resumeText || "",
        profilePhoto: existingProfile.profilePhoto || existingSelfie || "",
      });
    } else if (existingSelfie) {
      setPersonalDetails((prev) => ({
        ...prev,
        profilePhoto: existingSelfie,
      }));
    }

    if (email) {
      syncProfileFromDatabase(email).then((dbProfile) => {
        if (dbProfile) {
          setPersonalDetails({
            name: dbProfile.name,
            gender: dbProfile.gender,
            learningPrograms: dbProfile.learningPrograms,
            resumeFileName: dbProfile.resumeFileName || "",
            resumeText: dbProfile.resumeText || "",
            profilePhoto: dbProfile.profilePhoto || "",
          });
        }
      });
    }
  }, [email]);

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    
    setPersonalDetails(prev => ({
      ...prev,
      resumeFileName: file.name
    }));

    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPersonalDetails(prev => ({
          ...prev,
          resumeText: text
        }));
        toast.success("Resume text loaded successfully!");
      };
      reader.readAsText(file);
    } else {
      toast.info(`Uploaded "${file.name}". Since it is a binary file, please paste your resume details below.`);
    }
  };

  const handleProgramToggle = (id: string) => {
    setPersonalDetails((prev) => {
      const active = prev.learningPrograms.includes(id);
      return {
        ...prev,
        learningPrograms: active
          ? prev.learningPrograms.filter((p) => p !== id)
          : [...prev.learningPrograms, id],
      };
    });
  };

  // Validators
  const isValidDetails =
    personalDetails.name.trim().length > 2 &&
    personalDetails.gender !== "" &&
    personalDetails.learningPrograms.length > 0 &&
    personalDetails.profilePhoto !== "";

  const handleSubmit = () => {
    if (!isValidDetails) {
      toast.error("Please fill in all mandatory details.");
      return;
    }

    const profileData: UserProfile = {
      name: personalDetails.name,
      email,
      gender: personalDetails.gender,
      learningPrograms: personalDetails.learningPrograms,
      intakeAnswers: {}, // Empty since intake assessment is removed
      resumeFileName: personalDetails.resumeFileName,
      resumeText: personalDetails.resumeText,
      profilePhoto: personalDetails.profilePhoto,
    };

    saveUserProfile(profileData);
    const selfieKey = `interviewSelfie_${email.trim().toLowerCase()}`;
    sessionStorage.setItem(selfieKey, personalDetails.profilePhoto);
    toast.success("Profile Setup Complete! Welcome to Interview Ace.");
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      {/* Background Glows */}
      <div className="absolute top-[-20%] w-[1000px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[400px] bg-secondary/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl z-10 flex flex-col">
        {isProfileSetupComplete() && (
          <div className="mb-4 self-start">
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className="flex items-center gap-2 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3 text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Intake & Profile <span className="text-gradient">Setup</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Tell us about yourself and configure your personalized learning track to get started.
          </p>
        </div>

        {/* Multi-step progress indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              1
            </div>
            <span className={`text-xs font-semibold ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>Personal Details</span>
          </div>
          <div className="w-16 h-0.5 bg-border" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              2
            </div>
            <span className={`text-xs font-semibold ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>Review & Confirm</span>
          </div>
        </div>

        {/* Step Card Container */}
        <div className="glass rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 sm:p-10 shadow-xl overflow-hidden min-h-[480px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal details & learning track */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <h3 className="text-xl font-bold tracking-tight border-b pb-3 border-border/30">Personal Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1.5">
                        <User className="w-4 h-4 text-muted-foreground" /> Full Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={personalDetails.name}
                        onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })}
                        className="h-11 bg-background/50 border-border/50 focus:border-primary"
                      />
                    </div>

                    {/* Email (Prefilled/Readonly) */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                      </Label>
                      <Input
                        id="email"
                        value={email}
                        disabled
                        className="h-11 bg-muted/30 border-border/50 text-muted-foreground font-mono"
                      />
                    </div>

                    {/* Gender Selection */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" /> Gender
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        {["Male", "Female", "Prefer not to say"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setPersonalDetails({ ...personalDetails, gender: g })}
                            className={`h-11 border rounded-lg text-sm font-medium transition-all duration-300 ${
                              personalDetails.gender === g
                                ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                                : "bg-background/50 border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Profile Photo Section (Mandatory) */}
                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-border/20">
                      <div className="flex flex-col gap-1">
                        <Label className="text-sm font-bold flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-muted-foreground" /> Profile Photo (Mandatory)
                        </Label>
                        <p className="text-xs text-muted-foreground font-medium">
                          Please upload your profile photo or capture a live selfie. This is required for identity verification and exam integrity.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 bg-background/30 p-4 rounded-xl border border-border/50">
                        {/* Left Side: Avatar Preview or Live Video */}
                        <div className="relative w-32 h-32 rounded-full border-2 border-border/60 bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                          {cameraActive ? (
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : personalDetails.profilePhoto ? (
                            <img
                              src={personalDetails.profilePhoto}
                              alt="Profile avatar preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-muted-foreground/60" />
                          )}
                        </div>

                        {/* Right Side: Photo Controls */}
                        <div className="flex-1 space-y-3 w-full sm:w-auto">
                          <div className="flex flex-wrap gap-2.5">
                            {cameraActive ? (
                              <>
                                <Button
                                  type="button"
                                  onClick={captureSelfie}
                                  variant="hero"
                                  className="h-10 text-xs px-4"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1.5" /> Capture Photo
                                </Button>
                                <Button
                                  type="button"
                                  onClick={stopCamera}
                                  variant="outline"
                                  className="h-10 text-xs px-4 border-destructive/20 text-destructive hover:bg-destructive/5"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <label className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer shadow-sm">
                                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Photo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          setPersonalDetails((prev) => ({
                                            ...prev,
                                            profilePhoto: event.target?.result as string,
                                          }));
                                          toast.success("Profile photo uploaded!");
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <Button
                                  type="button"
                                  onClick={startCamera}
                                  variant="outline"
                                  className="h-10 text-xs px-4"
                                >
                                  <Camera className="w-3.5 h-3.5 mr-1.5" /> Take Selfie
                                </Button>
                                {personalDetails.profilePhoto && (
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      setPersonalDetails((prev) => ({ ...prev, profilePhoto: "" }))
                                    }
                                    variant="outline"
                                    className="h-10 text-xs px-4 border-destructive/20 text-destructive hover:bg-destructive/5"
                                  >
                                    <Trash className="w-3.5 h-3.5 mr-1.5" /> Remove
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            Supports PNG, JPG, or JPEG files. For webcams, grant camera access after clicking "Take Selfie".
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resume Upload / Copy-Paste */}
                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-border/20">
                      <div className="flex flex-col gap-1">
                        <Label className="text-sm font-bold flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-muted-foreground" /> Resume Upload & Details (Optional)
                        </Label>
                        <p className="text-xs text-muted-foreground font-medium">
                          Upload your resume (.txt files read directly) or paste your resume details below. The AI will formulate custom questions based on this.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 justify-center">
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 bg-background/50 hover:bg-muted/40 rounded-xl p-4 cursor-pointer transition-all duration-300">
                            <span className="text-xs font-bold text-primary">Choose Resume File</span>
                            <span className="text-[10px] text-muted-foreground mt-1">Supports PDF, DOCX, TXT</span>
                            <input
                              type="file"
                              accept=".txt,.pdf,.doc,.docx"
                              onChange={handleResumeFileChange}
                              className="hidden"
                            />
                          </label>
                          {personalDetails.resumeFileName && (
                            <div className="flex items-center gap-2 p-2 bg-success/5 border border-success/20 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                              <span className="text-xs font-semibold text-success truncate">{personalDetails.resumeFileName}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Textarea
                            placeholder="Or paste your resume text here (Skills, Projects, Experience)..."
                            value={personalDetails.resumeText}
                            onChange={(e) => setPersonalDetails({ ...personalDetails, resumeText: e.target.value })}
                            className="min-h-[110px] bg-background/50 border-border/50 focus:border-primary text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Learning tracks */}
                  <div className="space-y-4 pt-4">
                    <Label className="text-sm font-semibold block">Target Interview Categories (Choose at least 1)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {learningProgramsList.map((prog) => {
                        const active = personalDetails.learningPrograms.includes(prog.id);
                        return (
                          <button
                            key={prog.id}
                            type="button"
                            onClick={() => handleProgramToggle(prog.id)}
                            className={`p-4 rounded-xl border text-left transition-all duration-300 flex items-start gap-3 h-full ${
                              active
                                ? "bg-primary/5 border-primary text-primary"
                                : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <div className={`p-2 rounded-lg shrink-0 ${active ? "bg-primary/10" : "bg-muted"}`}>
                              <prog.icon className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <p className={`text-sm font-bold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{prog.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{prog.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-border/20 mt-4">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!isValidDetails}
                    className="h-11 px-6 font-semibold"
                  >
                    Continue to Review <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Review and submit */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <h3 className="text-xl font-bold tracking-tight border-b pb-3 border-border/30 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" /> Review Onboarding Details
                  </h3>

                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-background/25 p-6 rounded-xl border border-border/40">
                    {personalDetails.profilePhoto && (
                      <div className="w-24 h-24 rounded-full border border-border/60 overflow-hidden shrink-0 shadow-sm">
                        <img
                          src={personalDetails.profilePhoto}
                          alt="Profile selfie preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full text-center md:text-left">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Full Name</span>
                        <p className="text-sm font-bold text-foreground">{personalDetails.name}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email Address</span>
                        <p className="text-sm font-mono text-muted-foreground truncate">{email}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gender</span>
                        <p className="text-sm font-bold text-foreground">{personalDetails.gender}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Resume Status</span>
                        <p className={`text-xs font-bold ${personalDetails.resumeText ? "text-success" : "text-muted-foreground"}`}>
                          {personalDetails.resumeText 
                            ? `Attached (${personalDetails.resumeFileName || "Pasted Text"})` 
                            : "No Resume Provided"}
                        </p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Selected Interview Categories</span>
                        <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                          {personalDetails.learningPrograms.map((progId) => {
                            const label = learningProgramsList.find((p) => p.id === progId)?.label || progId;
                            return (
                              <Badge key={progId} variant="secondary" className="px-2 py-0.5 text-[10px] font-bold">
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-success/5 border border-success/20 rounded-xl p-5 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-success">Setup Details Confirmed</h4>
                      <p className="text-xs text-success/90 leading-relaxed font-medium mt-1">
                        Your learning profile is ready! You can now start customized Mock Interviews. Stage 1 consists of Multiple Choice Questions (MCQ) followed by Stage 2 with our dynamic Voice Assistant interviewer.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-border/30">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 px-6 font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Modify Profile
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    className="h-11 px-8 font-semibold shadow-md shadow-primary/10"
                  >
                    Finish Setup & Start <Check className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
