"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSubmission(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const title = String(formData.get("title") || "").trim();
  const originalText = String(
    formData.get("original_text") || ""
  ).trim();

  const correctedText = String(
    formData.get("ai_corrected_text") || ""
  ).trim();

  const score = Number(formData.get("ai_score"));

  if (!title || !originalText) {
    throw new Error("Title and original content are required.");
  }

  if (
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100
  ) {
    throw new Error("Invalid AI score.");
  }

  const { error } = await supabase
    .from("submissions")
    .insert({
      creator_id: user.id,
      title,
      original_text: originalText,
      ai_corrected_text: correctedText || null,
      ai_score: score,
      status: "pending",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard");
}

export async function approveSubmission(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    throw new Error("Submission ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const { data: manager } = await supabase
    .from("managers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!manager) {
    throw new Error("Manager permission required.");
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      manager_note: null,
    })
    .eq("id", id)
    .eq("status", "pending")
    
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw new Error("Submission unavailable or unauthorized.");
  }

  const { error: logError } = await supabase
    .from("approval_logs")
    .insert({
      submission_id: id,
      manager_id: user.id,
      action: "approved",
    });

  if (logError) {
    throw new Error("Approval saved, but history logging failed.");
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard");
}

export async function requestRevision(formData: FormData) {
  const id = String(formData.get("id") || "");
  const note = String(formData.get("note") || "").trim();

  if (!id || !note || note.length > 1000) {
    throw new Error("Enter valid revision feedback.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const { data: manager } = await supabase
    .from("managers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!manager) {
    throw new Error("Manager permission required.");
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({
      status: "revision",
      manager_note: note,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    
    
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw new Error("Submission unavailable or unauthorized.");
  }

  const { error: logError } = await supabase
    .from("approval_logs")
    .insert({
      submission_id: id,
      manager_id: user.id,
      action: "revision",
      note,
    });

  if (logError) {
    throw new Error("Revision saved, but history logging failed.");
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard");
}