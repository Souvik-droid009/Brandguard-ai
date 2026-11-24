"use client";
import { createClient } from "@/lib/supabase/client";
  

import { useRouter } from "next/navigation";
import Link from "next/link";


import React, { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  ShieldCheck,
  FileText,
  BookOpen,
  CheckCircle2,
  BarChart3,
  Upload,
  AlertTriangle,
  Sparkles,
  X,
  Lock,
  RefreshCw,
} from "lucide-react";
import { GuidelinesView, WorkflowView, InsightsView, SubmissionItem } from "./components/Views";

import { AuditResults, ReviewResult, Issue } from "./components/AuditResults";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_SIZE = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const PENDING_DRAFT_KEY = "brandguard_pending_draft";

const DEFAULT_GUIDELINES = `1. TONE & VOICE: Professional, trustworthy, empathetic, and clear. Never use aggressive hype, slang, or fear-mongering.
2. TERMINOLOGY: Always refer to our product as "BRAND GUARD Governance Suite" (never "the bot" or "auto-tool"). Use "customers" instead of "users".
3. FACTUAL & PROMOTIONAL CLAIMS: Never claim "100% guaranteed", "#1 in the world", or "zero risk" unless backed by a cited 2026 audit. Current supported languages: 28 languages (do not say 50+).
4. VISUAL CONSISTENCY: Visuals must use clean layouts, deep navy (#0B1120) or crisp white backgrounds, and electric blue (#3B82F6) accents. Avoid neon clutter or unreadable low-contrast text.
5. ACCESSIBILITY: Avoid ALL-CAPS paragraphs, ensure high visual contrast, and provide clear descriptive messaging for screen readers.`;

const SAMPLE_DRAFT = `Hey guys!! Our auto-tool is 100% GUARANTEED to make your company #1 in the world overnight with ZERO RISK! We now support over 50+ languages so users never have to worry about anything ever again.`;

export default function BRANDGUARDPlatform() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
  "analyzer" | "analysis" | "guidelines" | "workflow" | "insights"
>("analyzer");
  const [guidelines, setGuidelines] = useState<string>(DEFAULT_GUIDELINES);
  const [guidelinesSaved, setGuidelinesSaved] = useState<boolean>(false);

  const [draftTitle, setDraftTitle] = useState<string>("Q4 Product Launch Social Post");
  const [content, setContent] = useState<string>(SAMPLE_DRAFT);
  const MAX_DRAFT_CHARACTERS = 10000;

const characterCount = content.length;

const wordCount = content.trim()
  ? content.trim().split(/\s+/).length
  : 0;

const characterPercentage = Math.min(
  (characterCount / MAX_DRAFT_CHARACTERS) * 100,
  100
);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number | null>(null);
const [uploadError, setUploadError] = useState<string | null>(null);
// PDF Upload States
const [pdfFile, setPdfFile] = useState<File | null>(null);
const [pdfBase64, setPdfBase64] = useState<string | null>(null);
const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<boolean>(false);

  const [reviewerRole, setReviewerRole] = useState<"Creator" | "Manager">("Manager");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([
    {
      id: "SUB-104",
      title: "Enterprise Security Whitepaper Intro",
      creator: "Aarav Sharma (Marketing)",
      originalText: "Our bot keeps your files safe with zero risk.",
      revisedText: " Governance Suite protects confidential customer materials with human-in-the-loop controls.",
      score: 94,
      issuesCount: 0,
      status: "Pending Review",
      timestamp: "10 mins ago",
    },
  ]);

  const [issueHistory, setIssueHistory] = useState<Record<string, number>>({
    "Unsupported Claim": 7,
    "Terminology": 5,
    "Tone": 4,
    "Visual Consistency": 3,
    "Accessibility": 2,
    "Outdated Info": 2,
  });
  const [unclearGuidelineCount, setUnclearGuidelineCount] = useState<number>(2);

  // Restore a draft that was saved just before a creator was sent to sign in,
  // so signing in never costs them their analysis.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_DRAFT_KEY);
      if (!saved) return;
      sessionStorage.removeItem(PENDING_DRAFT_KEY);
      const draft = JSON.parse(saved);
      if (draft?.result) {
        setDraftTitle(draft.title || "Untitled Content Draft");
        setContent(draft.content || "");
        setResult(draft.result);
        setActiveTab("analysis");
      }
    } catch {
      // Ignore unreadable or unavailable storage; the creator can re-run the check.
    }
  }, []);

  const handleImageUpload = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  // Validate image format
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    setUploadError("Only JPG, PNG and WEBP images are supported.");
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setImageSize(null);
    e.target.value = "";
    return;
  }

  // Validate image size
  if (file.size > MAX_IMAGE_SIZE) {
    setUploadError(
      `Your image is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 5 MB.`
    );

    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setImageSize(null);

    e.target.value = "";
    return;
  }

  // Accept valid image
  setUploadError(null);
  setImageSize(file.size);

  const reader = new FileReader();

  reader.onloadend = () => {
    const dataUrl = reader.result as string;

    setImagePreview(dataUrl);

    const commaIndex = dataUrl.indexOf(",");

    setImageBase64(
      commaIndex !== -1
        ? dataUrl.slice(commaIndex + 1)
        : dataUrl
    );

    setImageMimeType(file.type);
  };

  reader.readAsDataURL(file);
};
// PDF Upload Handler
const handlePdfUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  setPdfUploadError(null);
  setPdfFile(null);
  setPdfBase64(null);
  setPdfPageCount(null);

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    setPdfUploadError("Only PDF documents are supported.");
    e.target.value = "";
    return;
  }

  if (file.size > MAX_PDF_SIZE) {
    setPdfUploadError("PDF size must not exceed 10 MB.");
    e.target.value = "";
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdfDocument = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false,
    });

    const pageCount = pdfDocument.getPageCount();

    if (pageCount > MAX_PDF_PAGES) {
      setPdfUploadError(
        `Your PDF contains ${pageCount} pages. Maximum allowed is 20 pages.`
      );
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      const dataUrl = reader.result as string;

      setPdfBase64(dataUrl.split(",")[1]);
      setPdfFile(file);
      setPdfPageCount(pageCount);
      setPdfUploadError(null);
    };

    reader.onerror = () => {
      setPdfUploadError("Unable to read PDF. Please try again.");
    };

    reader.readAsDataURL(file);

  } catch {
    setPdfUploadError(
      "Unable to read this PDF. Please upload a valid, unencrypted PDF."
    );
    e.target.value = "";
  }
};

  

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSubmittedNotice(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  content,
  guidelines,
  imageBase64,
  imageMimeType,
  pdfBase64,
  pdfFileName: pdfFile?.name || null,
}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze content.");

      setResult(data);
      setActiveTab("analysis")

      if (data.issues && Array.isArray(data.issues)) {
        setIssueHistory((prev) => {
          const updated = { ...prev };
          data.issues.forEach((iss: Issue) => {
            updated[iss.category] = (updated[iss.category] || 0) + 1;
          });
          return updated;
        });
        const unclearCount = data.issues.filter((i: Issue) => i.guidelineClarityFlag).length;
        if (unclearCount > 0) setUnclearGuidelineCount((prev) => prev + unclearCount);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong while connecting to Gemini.");
    } finally {
      setLoading(false);
    }
  };

 const handleSubmitForApproval = async () => {
    if (!result) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Creators only need a normal sign-in. Keep their draft and bring them
      // back here afterwards instead of dropping them into manager verification.
      try {
        sessionStorage.setItem(
          PENDING_DRAFT_KEY,
          JSON.stringify({ title: draftTitle, content, result })
        );
      } catch {
        // Storage unavailable: they will just need to re-run the check.
      }
      document.cookie = "bg_next=/; path=/; max-age=600; SameSite=Lax";
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.from("submissions").insert([
      {
        title: draftTitle || "Untitled Content Draft",
        original_text: content,
        ai_corrected_text: result.revisedContent || null,
        ai_score: result.complianceScore ?? null,
        status: "pending",
        creator_id: user.id,
      },
    ]);

    if (error) {
      alert("Error saving to approvals: " + error.message);
      return;
    }

    setSubmittedNotice(true);
    window.location.href = "/dashboard/approvals?view=creator";
  };

  const handleDecision = (id: string, decision: "Approved" | "Changes Requested") => {
    setSubmissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: decision } : item))
    );
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans">
      <header className="border-b border-slate-800/80 bg-[#0A0F1D]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">I</div>
            <span className="font-bold tracking-wider text-lg text-white">
               BRAND GUARD <span className="text-blue-400">AI</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("analyzer")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === "analyzer" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" /> Analyzer
            </button>
            <button
  onClick={() => setActiveTab("analysis")}
  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium ${
    activeTab === "analysis"
      ? "bg-blue-600 text-white"
      : "text-slate-400 hover:text-white"
  }`}
>
  <FileText className="w-4 h-4" /> Analysis
</button>
            <button
              onClick={() => setActiveTab("guidelines")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === "guidelines" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Guidelines
            </button>
            <button
  onClick={() => router.push("/dashboard/approvals")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === "workflow" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Approvals
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === "insights" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Insights
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> Human-in-the-Loop
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {activeTab === "analyzer" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase">AI-Powered Brand Governance</p>
              <h1 className="text-3xl md:text-5xl font-bold text-white">Every word &amp; visual should reflect your brand.</h1>
             
  {/* NEW SUBHEADING */}
  <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
    Audit copy and visual assets against your brand guidelines for tone, claims, and visual compliance.
  </p>

            </div>

            <div className="bg-[#0E1526] border border-slate-800 rounded-2xl p-6 space-y-5">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white w-full max-w-md"
                placeholder="Campaign Title..."
              />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" /> Draft Content
                  </label>
                  <button onClick={() => setContent(SAMPLE_DRAFT)} className="text-xs text-slate-400 underline">
                    Load Sample Off-Brand Text
                  </button>
                </div>
                
                
                <div>
  <textarea
    rows={5}
    value={content}
    maxLength={MAX_DRAFT_CHARACTERS}
    onChange={(e) => {
      setContent(e.target.value.slice(0, MAX_DRAFT_CHARACTERS));
    }}
    placeholder="Enter your brand content here..."
    className="w-full bg-[#080D1A] border border-slate-700 rounded-xl p-4 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-y"
  />

  {/* Live Character and Word Counter */}
  <div className="mt-3 space-y-2">

    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400">
        Draft content limit: 10,000 characters
      </span>

      <span
        className={`font-semibold ${
          characterCount >= MAX_DRAFT_CHARACTERS
            ? "text-red-400"
            : "text-blue-400"
        }`}
      >
        {characterCount.toLocaleString("en-IN")} / 10,000 characters
      </span>
    </div>

    {/* Progress Bar */}
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-200 ${
          characterCount >= MAX_DRAFT_CHARACTERS
            ? "bg-red-500"
            : "bg-blue-500"
        }`}
        style={{ width: `${characterPercentage}%` }}
      />
    </div>

    {/* Word Count and Remaining Characters */}
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">
        {wordCount.toLocaleString("en-IN")} words
      </span>

      <span className={
        characterCount >= MAX_DRAFT_CHARACTERS
          ? "text-red-400"
          : "text-slate-400"
      }>
        {(
          MAX_DRAFT_CHARACTERS - characterCount
        ).toLocaleString("en-IN")} characters remaining
      </span>
    </div>

    {characterCount >= MAX_DRAFT_CHARACTERS && (
      <p className="text-xs text-red-400">
        
        Maximum character limit reached. Remove some text to continue.
      </p>
    )}

  </div>
</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">

  <div className="flex items-center justify-between flex-wrap gap-3">
    <div className="flex items-center gap-3">
      <Upload className="w-5 h-5 text-blue-400" />
      <span className="text-sm text-slate-200">
        Attach Visual Asset (Optional)
      </span>
    </div>

    <div className="flex items-center gap-3">
      {imagePreview && (
        <button
          onClick={() => {
            setImagePreview(null);
            setImageBase64(null);
            setImageMimeType(null);
            setImageSize(null);
            setUploadError(null);
          }}
          className="text-xs text-red-400 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Remove Image
        </button>
      )}

      <label className="cursor-pointer bg-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition">
        {imagePreview ? "Change Image" : "Upload Image"}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>
    </div>
  </div>

  <div className="space-y-3">
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400">
        Maximum allowed image size
      </span>
      <span className="text-cyan-400 font-semibold">
        5 MB
      </span>
    </div>

    {imageSize !== null && (
      <>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">
            Selected image size
          </span>
          <span className="text-cyan-400 font-semibold">
            {(imageSize / (1024 * 1024)).toFixed(2)} MB / 5 MB
          </span>
        </div>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(
                (imageSize / MAX_IMAGE_SIZE) * 100,
                100
              )}%`,
            }}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Image size is within the allowed limit.
        </div>
      </>
    )}

    {!imagePreview && !uploadError && (
      <p className="text-xs text-slate-500">
        Supported formats: JPG, PNG, WEBP. Maximum size: 5 MB.
      </p>
    )}

    {uploadError && (
      <div className="flex items-start gap-2 bg-red-950/40 border border-red-500/30 rounded-lg p-3">
        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />

        <div>
          <p className="text-sm text-red-400 font-semibold">
            Image Upload Failed
          </p>
          <p className="text-xs text-red-300 mt-1">
            {uploadError}
          </p>
        </div>
      </div>
    )}
  </div>
</div>
{/* PDF Upload Section */}
<div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">

  <div className="flex items-center justify-between flex-wrap gap-3">

    <div className="flex items-center gap-3">
      <FileText className="w-5 h-5 text-red-400" />

      <span className="text-sm text-slate-200">
        Attach PDF Document (Optional)
      </span>
    </div>

    <div className="flex items-center gap-3">

      {pdfFile && (
        <button
          onClick={() => {
            setPdfFile(null);
            setPdfBase64(null);
            setPdfPageCount(null);
            setPdfUploadError(null);
          }}
          className="text-xs text-red-400 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Remove PDF
        </button>
      )}

      <label className="cursor-pointer bg-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition">

        {pdfFile ? "Change PDF" : "Upload PDF"}

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handlePdfUpload}
          className="hidden"
        />

      </label>

    </div>
  </div>

  <div className="space-y-3">

    <div className="flex justify-between items-center text-xs">

      <span className="text-slate-400">
        Maximum allowed PDF size
      </span>

      <span className="text-cyan-400 font-semibold">
        10 MB
      </span>

    </div>

    {pdfFile && (
      <>
        <div className="flex justify-between items-center text-sm">

          <span className="text-slate-300">
            Selected PDF
          </span>

          <span className="text-cyan-400 font-semibold">
            {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB / 10 MB
          </span>

        </div>

        <div className="flex items-center gap-2 bg-slate-800/70 rounded-lg p-3">

          <FileText className="w-8 h-8 text-red-400 shrink-0" />

          <div className="min-w-0">
            <p className="text-sm text-white truncate">
              {pdfFile.name}
            </p>
<p className="text-xs text-cyan-400 mt-1">
  PDF Pages: {pdfPageCount ?? 0} / 20
</p>
            <p className="text-xs text-slate-400">
              PDF Document
            </p>
          </div>

          <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto shrink-0" />

        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          PDF uploaded successfully.
        </div>
      </>
    )}

    {!pdfFile && !pdfUploadError && (
      <p className="text-xs text-slate-500">
        Supported format: PDF. Maximum size: 10 MB.
      </p>
    )}

    {pdfUploadError && (
      <div className="flex items-start gap-2 bg-red-950/40 border border-red-500/30 rounded-lg p-3">

        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />

        <div>
          <p className="text-sm text-red-400 font-semibold">
            PDF Upload Failed
          </p>

          <p className="text-xs text-red-300 mt-1">
            {pdfUploadError}
          </p>
        </div>

      </div>
    )}

  </div>
</div>
<div className="flex justify-end">
  <button
    onClick={handleAnalyze}
    disabled={loading || !!uploadError || !!pdfUploadError}
    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-full text-sm flex items-center gap-2"
  >
    {loading ? (
      <RefreshCw className="w-4 h-4 animate-spin" />
    ) : (
      <ShieldCheck className="w-4 h-4" />
    )}

    {loading
      ? "Auditing Brand Compliance..."
      : "Run Brand Governance Check"}
  </button>
</div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/40 text-red-200 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            
          </div>
        )}
        {activeTab === "analysis" && (
  <div className="space-y-8">
{result ? (
  <AuditResults
    result={result}
    onReplaceDraft={() => setContent(result.revisedContent)}
    onSubmitApproval={handleSubmitForApproval}
    submittedNotice={submittedNotice}
   onGoToWorkflow={() => window.location.href = "/dashboard/approvals?view=creator"}
  />
) : ( 
      <div className="bg-[#0E1526] border border-slate-800 rounded-2xl p-8 text-center">
        <FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" />

        <h2 className="text-xl font-bold text-white">
          No Analysis Available
        </h2>

        <p className="text-slate-400 mt-2">
          Upload your content and run a brand governance check to see your analysis here.
        </p>

        <button
          onClick={() => setActiveTab("analyzer")}
          className="mt-5 bg-blue-600 px-5 py-2 rounded-lg text-white"
        >
          Go to Analyzer
        </button>
      </div>
    )}

  </div>
)}

        {activeTab === "guidelines" && (
          <GuidelinesView
            guidelines={guidelines}
            setGuidelines={setGuidelines}
            guidelinesSaved={guidelinesSaved}
            setGuidelinesSaved={setGuidelinesSaved}
            defaultGuidelines={DEFAULT_GUIDELINES}
          />
        )}

        

        {activeTab === "insights" && (
          <InsightsView issueHistory={issueHistory} unclearGuidelineCount={unclearGuidelineCount} />
        )}
      </main>
    </div>
  );
}
