import type { ReactNode } from "react";
import { connection } from "next/server";
import Link from "next/link";
import LogoutButton from "./logoutButton";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DemoAccess from "./DemoAccess";
import { approveSubmission, requestRevision } from "./actions";

interface Submission {
  id: string | number;
  title: string;
  status: string;
  ai_score: number | null;
  original_text: string;
  ai_corrected_text: string | null;
  manager_note: string | null;
}

export const instant = false;
export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await connection();
  const { view: requestedView } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: manager } = await supabase
    .from("managers")
    .select("user_id, email, access_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const isManager = !!manager;

  // Creators land on their own tab. Managers land on the review queue unless
  // a tab was asked for. The Manager tab is gated, never a redirect to sign-in.
  const view: "creator" | "manager" =
    requestedView === "manager"
      ? "manager"
      : requestedView === "creator"
        ? "creator"
        : isManager
          ? "manager"
          : "creator";

  const canReview = view === "manager" && isManager;

  let safeSubmissions: Submission[] = [];

  // A non-manager on the Manager tab only sees the access gate, no queue.
  if (view === "creator" || isManager) {
    let query = supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (view === "creator") {
      query = query.eq("creator_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return (
        <main className="min-h-screen bg-[#080d1b] p-10 text-white">
          Unable to load submissions: {error.message}
        </main>
      );
    }

    safeSubmissions = (data ?? []) as Submission[];
  }

  const pending = safeSubmissions.filter(
    (item) => item.status === "pending"
  );

  const approved = safeSubmissions.filter(
    (item) => item.status === "approved"
  );

  const revision = safeSubmissions.filter(
    (item) => item.status === "revision"
  );

  return (
    <main className="min-h-screen bg-[#080d1b] p-6 text-white md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Review &amp; Approval Workflow
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Brand Guard AI · Human-in-the-Loop
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
          >
            ← Analyzer
          </Link>

          <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">
            {isManager ? "Verified Manager" : "Creator Mode"}
          </div>
          <LogoutButton />
        </div>
      </header>

      <nav className="mt-8 inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
        <TabLink
          href="/dashboard/approvals?view=creator"
          active={view === "creator"}
        >
          Creator
        </TabLink>
        <TabLink
          href="/dashboard/approvals?view=manager"
          active={view === "manager"}
        >
          Manager
        </TabLink>
      </nav>

      {view === "manager" && !isManager && (
        <section className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <h2 className="text-xl font-bold">
            Manager Access Required
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            You are signed in as {user.email}, but this
            account is not an authorized manager.
          </p>

          <p className="mt-3 text-sm text-yellow-300">
            Enter your manager invitation code to review and
            approve content. Your creator tab keeps working
            either way.
          </p>

          <DemoAccess />
        </section>
      )}

      {(view === "creator" || isManager) && (
        <>
          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat title="Pending Review" value={pending.length} />
            <Stat title="Approved" value={approved.length} />
            <Stat title="Revision Needed" value={revision.length} />
          </section>

          <section className="mt-10">
            <h2 className="mb-5 text-xl font-bold">
              {view === "creator" ? "My Submissions" : "Submission Queue"}
            </h2>

            <div className="space-y-5">
              {safeSubmissions.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="text-lg font-bold">
                      {item.title}
                    </h3>

                    <Status status={item.status} />
                  </div>

                  <p className="mt-2 text-sm text-gray-400">
                    AI Brand Score: {item.ai_score ?? "Not scored"}%
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="mb-2 text-sm font-semibold text-gray-400">
                        Original
                      </p>
                      {item.original_text}
                    </div>

                    <div className="rounded-xl bg-blue-500/5 p-4">
                      <p className="mb-2 text-sm font-semibold text-green-300">
                        AI-Corrected
                      </p>
                      {item.ai_corrected_text || "No correction available"}
                    </div>
                  </div>

                  {item.manager_note && (
                    <p className="mt-4 text-sm text-yellow-300">
                      Manager note: {item.manager_note}
                    </p>
                  )}

                  {canReview && item.status === "pending" && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <form action={approveSubmission}>
                        <input
                          type="hidden"
                          name="id"
                          value={item.id}
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
                        >
                          ✓ Approve
                        </button>
                      </form>

                      <form action={requestRevision} className="flex flex-wrap gap-3">
                        <input
                          type="hidden"
                          name="id"
                          value={item.id}
                        />
                        <input
                          type="text"
                          name="note"
                          placeholder="Revision feedback"
                          required
                          className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold hover:bg-yellow-500"
                        >
                          Request Revision
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              ))}

              {safeSubmissions.length === 0 && (
                <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">
                  {view === "creator"
                    ? "You haven't submitted anything yet. Run a brand check on the Analyzer and send it for approval."
                    : "No submissions yet."}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-5 py-2 text-sm font-medium ${
        active
          ? "bg-blue-600 text-white"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "text-blue-300 bg-blue-500/10",
    approved: "text-green-300 bg-green-500/10",
    revision: "text-yellow-300 bg-yellow-500/10",
  };

  const labels: Record<string, string> = {
    pending: "Pending Review",
    approved: "Approved",
    revision: "Revision Needed",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-sm ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}
