"use client";

import { Check, ArrowRight } from "lucide-react";

export interface Issue {
  category: string;
  severity: "High" | "Medium" | "Low";
  problematicSnippet: string;
  explanation: string;
  suggestedFix: string;
  guidelineClarityFlag: boolean;
}

export interface ReviewResult {
  complianceScore: number;
  overallSummary: string;
  issues: Issue[];
  revisedContent: string;
}

export function AuditResults({
  result,
  onReplaceDraft,
  onSubmitApproval,
  submittedNotice,
  onGoToWorkflow,
}: {
  result: ReviewResult;
  onReplaceDraft: () => void;
  onSubmitApproval: () => void;
  submittedNotice: boolean;
  onGoToWorkflow: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-[#0E1526] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Explainable Audit Report ({result.issues.length} Issues)
          </span>
          <p className="text-slate-200 text-sm md:text-base">{result.overallSummary}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 px-5 py-3.5 rounded-xl">
          <p className="text-xs text-slate-400">Brand Score</p>
          <p className="text-3xl font-bold text-blue-400">{result.complianceScore}%</p>
        </div>
      </div>

      {result.issues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.issues.map((issue, idx) => (
            <div key={idx} className="bg-[#0E1526] border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300">
                  {issue.category}
                </span>
                <span className="text-xs text-amber-300">{issue.severity} Risk</span>
              </div>
              <div className="text-xs bg-red-950/30 border border-red-900/40 text-red-200 px-3 py-2 rounded-lg">
                <strong>Flagged: </strong>&quot;{issue.problematicSnippet}&quot;
              </div>
              <p className="text-xs text-slate-300">
                <strong>Why: </strong>{issue.explanation}
              </p>
              <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 px-3 py-2 rounded-lg">
                <strong>Suggested Fix: </strong>{issue.suggestedFix}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0E182E] border border-blue-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Recommended Brand-Aligned Version</h3>
          <button
            onClick={onReplaceDraft}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3.5 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Replace Draft with Fix
          </button>
        </div>
        <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 text-sm text-emerald-100">
          {result.revisedContent}
        </div>
        <div className="flex items-center justify-between pt-2">
          {submittedNotice ? (
            <span className="text-emerald-400 text-sm font-medium">
              Sent to Approval Queue!{" "}
              <button onClick={onGoToWorkflow} className="underline text-blue-400">
                View in Approvals →
              </button>
            </span>
          ) : (
            <span className="text-xs text-slate-400">Send this draft to an authorized reviewer.</span>
          )}
          <button
            onClick={onSubmitApproval}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2"
          >
            Submit for Manager Approval <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}