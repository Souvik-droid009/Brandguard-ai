"use client";

import { BookOpen, CheckCircle2, BarChart3, Check, Eye } from "lucide-react";

export interface SubmissionItem {
  id: string;
  title: string;
  creator: string;
  originalText: string;
  revisedText: string;
  score: number;
  issuesCount: number;
  status: "Pending Review" | "Approved" | "Changes Requested";
  timestamp: string;
}

export function GuidelinesView({
  guidelines,
  setGuidelines,
  guidelinesSaved,
  setGuidelinesSaved,
  defaultGuidelines,
}: {
  guidelines: string;
  setGuidelines: (val: string) => void;
  guidelinesSaved: boolean;
  setGuidelinesSaved: (val: boolean) => void;
  defaultGuidelines: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-blue-400" /> Approved Brand Guidelines &amp; Facts
      </h2>
      <div className="bg-[#0E1526] border border-slate-800 rounded-2xl p-6 space-y-4">
        <textarea
          rows={10}
          value={guidelines}
          onChange={(e) => {
            setGuidelines(e.target.value);
            setGuidelinesSaved(false);
          }}
          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl p-4 text-sm text-slate-200 font-mono"
        />
        <div className="flex items-center justify-between">
          <button onClick={() => setGuidelines(defaultGuidelines)} className="text-xs text-slate-400 underline">
            Reset to Default
          </button>
          <div className="flex items-center gap-3">
            {guidelinesSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
            <button
              onClick={() => setGuidelinesSaved(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl"
            >
              Save Guidelines
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowView({
  submissions,
  reviewerRole,
  setReviewerRole,
  handleDecision,
}: {
  submissions: SubmissionItem[];
  reviewerRole: "Creator" | "Manager";
  setReviewerRole: (role: "Creator" | "Manager") => void;
  handleDecision: (id: string, decision: "Approved" | "Changes Requested") => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Review &amp; Approval Workflow</h2>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => setReviewerRole("Creator")}
            className={`text-xs px-3 py-1 rounded-lg ${reviewerRole === "Creator" ? "bg-blue-600 text-white" : "text-slate-400"}`}
          >
            Creator
          </button>
          <button
            onClick={() => setReviewerRole("Manager")}
            className={`text-xs px-3 py-1 rounded-lg ${reviewerRole === "Manager" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
          >
            Manager
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {submissions.map((item) => (
          <div key={item.id} className="bg-[#0E1526] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-white">{item.id} • {item.title}</h3>
                <p className="text-xs text-slate-400">{item.creator} • AI Score: {item.score}%</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/15 text-blue-300">
                {item.status}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900 p-3.5 rounded-xl">
                <strong className="text-slate-400 block mb-1">Original:</strong>
                <p className="text-slate-300">{item.originalText}</p>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-3.5 rounded-xl">
                <strong className="text-emerald-400 block mb-1">AI-Corrected:</strong>
                <p className="text-emerald-100">{item.revisedText}</p>
              </div>
            </div>
            {reviewerRole === "Manager" ? (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleDecision(item.id, "Changes Requested")}
                  className="px-4 py-2 rounded-lg text-xs bg-slate-800 text-amber-300"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => handleDecision(item.id, "Approved")}
                  className="px-4 py-2 rounded-lg text-xs bg-emerald-600 text-white flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Switch role to Manager above to approve.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsView({
  issueHistory,
  unclearGuidelineCount,
}: {
  issueHistory: Record<string, number>;
  unclearGuidelineCount: number;
}) {
  const entries = Object.entries(issueHistory).sort((a, b) => Number(b.at(1)) - Number(a.at(1)));
  const topName = String(entries.at(0)?.at(0) || "None");
  const topCount = Number(entries.at(0)?.at(1) || 0);
  const maxVal = Math.max(...Object.values(issueHistory), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-400" /> Brand Governance Insights
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0E1526] border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">Most Repeated Mistake</p>
          <p className="text-xl font-bold text-red-400 mt-1">{topName} ({topCount})</p>
        </div>
        <div className="bg-[#0E1526] border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">Unclear Guideline Alerts</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{unclearGuidelineCount} Flagged</p>
        </div>
        <div className="bg-[#0E1526] border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400">Prevention Rate</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">96.4%</p>
        </div>
      </div>
      <div className="bg-[#0E1526] border border-slate-800 rounded-2xl p-6 space-y-3">
        {entries.map(([category, count]) => (
          <div key={category} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{category}</span>
              <span className="text-slate-400">{count}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.round((count / maxVal) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}