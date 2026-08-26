import { supabase } from "./supabase";

export const PENDING_ASSESSMENT_KEY = "dmd_ai_pending_assessment_v1";

export type PendingFamilyAssessment = {
  client_assessment_id: string;
  source: "guest_transfer" | "family_portal";
  subject_label?: string | null;
  family_member_id?: string | null;
  narrative: string;
  structured_history: Record<string, unknown>;
  result_level: "limited" | "review" | "priority" | "acute" | "urgent";
  result_title: string;
  result_summary: string;
  clinician_summary: string;
  detected_features: string[];
  reasons: string[];
  uncertainty: string[];
  next_steps: string[];
  assessment_version: string;
  occurred_at: string;
};

export type FamilyMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
  relationship_to_family: string | null;
  date_of_birth: string | null;
};

export type UnassignedAssessment = {
  id: string;
  result_title: string;
  result_summary: string;
  occurred_at: string;
  family_member_id: string | null;
};

export function savePendingAssessment(value: PendingFamilyAssessment) {
  localStorage.setItem(PENDING_ASSESSMENT_KEY, JSON.stringify(value));
}

export function readPendingAssessment(): PendingFamilyAssessment | null {
  try {
    const raw = localStorage.getItem(PENDING_ASSESSMENT_KEY);
    return raw ? JSON.parse(raw) as PendingFamilyAssessment : null;
  } catch { return null; }
}

export async function getFamilyMembersForCurrentUser(): Promise<FamilyMemberOption[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("patients")
    .select("id,first_name,last_name,relationship_to_family,date_of_birth")
    .eq("family_owner_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FamilyMemberOption[];
}

async function resolveOnlyFamilyMember(userId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("id")
    .eq("family_owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(2);
  if (error) throw error;
  return data?.length === 1 ? data[0].id : null;
}

export async function syncPendingAssessment() {
  const pending = readPendingAssessment();
  if (!pending) return { synced: false as const };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: false as const };

  const familyMemberId =
    pending.family_member_id ?? await resolveOnlyFamilyMember(user.id);

  const { error } = await supabase.from("family_assessments").upsert({
    ...pending,
    family_member_id: familyMemberId,
    user_id: user.id,
  }, { onConflict: "user_id,client_assessment_id" });

  if (error) throw error;
  localStorage.removeItem(PENDING_ASSESSMENT_KEY);
  window.dispatchEvent(new CustomEvent("dmd-assessment-synced"));
  return { synced: true as const, family_member_id: familyMemberId };
}

export async function getUnassignedAssessments(): Promise<UnassignedAssessment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("family_assessments")
    .select("id,result_title,result_summary,occurred_at,family_member_id")
    .eq("user_id", user.id)
    .is("family_member_id", null)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UnassignedAssessment[];
}

export async function assignAssessmentToFamilyMember(assessmentId: string, familyMemberId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: member, error: memberError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", familyMemberId)
    .eq("family_owner_id", user.id)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new Error("That family member is not available to this account.");

  const { error } = await supabase
    .from("family_assessments")
    .update({ family_member_id: familyMemberId })
    .eq("id", assessmentId)
    .eq("user_id", user.id);
  if (error) throw error;

  window.dispatchEvent(new CustomEvent("dmd-assessment-synced"));
}

export async function autoAssignUnassignedWhenSingleMember() {
  const members = await getFamilyMembersForCurrentUser();
  if (members.length !== 1) return { assigned: 0, member: members[0] ?? null };

  const rows = await getUnassignedAssessments();
  if (!rows.length) return { assigned: 0, member: members[0] };

  const ids = rows.map((row) => row.id);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { assigned: 0, member: members[0] };

  const { error } = await supabase
    .from("family_assessments")
    .update({ family_member_id: members[0].id })
    .in("id", ids)
    .eq("user_id", user.id);
  if (error) throw error;

  window.dispatchEvent(new CustomEvent("dmd-assessment-synced"));
  return { assigned: ids.length, member: members[0] };
}
