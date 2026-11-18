"use client";

import React, { useState } from "react";
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

const DEFAULT_GUIDELINES = `1. TONE & VOICE: Professional, trustworthy, empathetic, and clear. Never use aggressive hype, slang, or fear-mongering.
2. TERMINOLOGY: Always refer to our product as "BRAND GUARD Governance Suite" (never "the bot" or "auto-tool"). Use "customers" instead of "users".
3. FACTUAL & PROMOTIONAL CLAIMS: Never claim "100% guaranteed", "#1 in the world", or "zero risk" unless backed by a cited 2026 audit. Current supported languages: 28 languages (do not say 50+).
4. VISUAL CONSISTENCY: Visuals must use clean layouts, deep navy (#0B1120) or crisp white backgrounds, and electric blue (#3B82F6) accents. Avoid neon clutter or unreadable low-contrast text.
5. ACCESSIBILITY: Avoid ALL-CAPS paragraphs, ensure high visual contrast, and provide clear descriptive messaging for screen readers.`;

const SAMPLE_DRAFT = `Hey guys!! Our auto-tool is 100% GUARANTEED to make your company #1 in the world overnight with ZERO RISK! We now support over 50+ languages so users never have to worry about anything ever again.`;

export default function BRANDGUARDPlatform() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "guidelines" | "workflow" | "insights">("analyzer");
  const [guidelines, setGuidelines] = useState<string>(DEFAULT_GUIDELINES);
  const [guidelinesSaved, setGuidelinesSaved] = useState<boolean>(false);

  const [draftTitle, setDraftTitle] = useState<string>("Q4 Product Launch Social Post");
  const [content, setContent] = useState<string>(SAMPLE_DRAFT);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files.item(0) : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      const commaIndex = dataUrl.indexOf(",");
      setImageBase64(commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl);
      setImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
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
        body: JSON.stringify({ content, guidelines, imageBase64, imageMimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze content.");

      setResult(data);

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

  const handleSubmitForApproval = () => {
    if (!result) return;
    const newItem: SubmissionItem = {
      id: `SUB-${Math.floor(105 + Math.random() * 890)}`,
      title: draftTitle || "Untitled Content Draft",
      creator: "You (Content Creator)",
      originalText: content,
      revisedText: result.revisedContent,
      score: result.complianceScore,
      issuesCount: result.issues.length,
      status: "Pending Review",
      timestamp: "Just now",
    };
    setSubmissions([newItem, ...submissions]);
    setSubmittedNotice(true);
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
              onClick={() => setActiveTab("guidelines")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === "guidelines" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Guidelines
            </button>
            <button
              onClick={() => setActiveTab("workflow")}
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
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#080D1A] border border-slate-700 rounded-xl p-4 text-slate-100 text-sm"
                />
              </div>
              <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-200">Attach Visual Asset (Optional)</span>
                </div>
                <div className="flex items-center gap-3">
                  {imagePreview && (
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setImageBase64(null);
                        setImageMimeType(null);
                      }}
                      className="text-xs text-red-400 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Remove Image
                    </button>
                  )}
                  <label className="cursor-pointer bg-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700">
                    {imagePreview ? "Change Image" : "Upload Image"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {loading ? "Auditing Brand Compliance..." : "Run Brand Governance Check"}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/40 text-red-200 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <AuditResults
                result={result}
                onReplaceDraft={() => setContent(result.revisedContent)}
                onSubmitApproval={handleSubmitForApproval}
                submittedNotice={submittedNotice}
                onGoToWorkflow={() => setActiveTab("workflow")}
              />
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

        {activeTab === "workflow" && (
          <WorkflowView
            submissions={submissions}
            reviewerRole={reviewerRole}
            setReviewerRole={setReviewerRole}
            handleDecision={handleDecision}
          />
        )}

        {activeTab === "insights" && (
          <InsightsView issueHistory={issueHistory} unclearGuidelineCount={unclearGuidelineCount} />
        )}
      </main>
    </div>
  );
}