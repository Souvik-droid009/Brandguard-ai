"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
  redirectTo: `${window.location.origin}/auth/callback`,
  queryParams: {
    prompt: "select_account",
  },
},
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080d1b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-xl">
        <div className="text-3xl font-bold">
          BRAND GUARD <span className="text-blue-400">AI</span>
        </div>

        <h1 className="mt-10 text-2xl font-bold">
          Manager Verification
        </h1>

        <p className="mt-3 text-gray-400">
          Sign in with Google to verify your manager permissions.
        </p>

        <button
          onClick={signIn}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <p className="mt-5 text-xs text-gray-500">
          Google authentication does not automatically grant manager access.
        </p>
      </div>
    </main>
  );
}