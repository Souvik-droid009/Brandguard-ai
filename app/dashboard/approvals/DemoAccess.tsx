"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DemoAccess() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const judgeCode = "Inkloom-Demo-2026";

  function handleCopy() {
    navigator.clipboard.writeText(judgeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function claimAccess() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { data: { user } } =
      await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.rpc(
      "claim_manager_invite",
      { p_code: code.trim() }
    );

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Manager access granted!");
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          Hackathon Demo Access
        </h2>

        <button
          type="button"
          onClick={handleCopy}
          title="Click to copy invitation code"
          className="cursor-pointer rounded-lg border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-mono text-blue-300 transition hover:bg-blue-500/30"
        >
          {copied
            ? "Copied to clipboard! ✓"
            : `Invitation code for judges is ${judgeCode}`}
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-400">
        Have a temporary manager invitation code?
        Enter it below after signing in.
      </p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter invitation code"
        className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-blue-500"
      />

      <button
        onClick={claimAccess}
        disabled={loading || !code.trim()}
        className="mt-4 w-full rounded-xl bg-blue-600 p-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Verify Manager Access"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-blue-300">
          {message}
        </p>
      )}
    </div>
  );
}