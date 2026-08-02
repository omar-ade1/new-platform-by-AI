import type { SupabaseClient, User } from "@supabase/supabase-js";

export type EnrollmentInfo = { id: string; expires_at: string | null } | null;

function isEnrollmentActive(enrollment: EnrollmentInfo): boolean {
  return !!enrollment && (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date());
}

export async function getEnrollment(supabase: SupabaseClient, userId: string, courseId: string): Promise<EnrollmentInfo> {
  const { data } = await supabase.from("enrollments").select("id, expires_at").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  return data;
}

// أدمن أو طالب مشترك ومؤقته لسه ماخلصش — نفس منطق RLS بتاع is_admin()/is_enrolled()
export async function getCourseAccessInfo(
  supabase: SupabaseClient,
  user: User | null,
  courseId: string
): Promise<{ hasAccess: boolean; enrollment: EnrollmentInfo }> {
  if (!user) return { hasAccess: false, enrollment: null };

  const [{ data: profile }, enrollment] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    getEnrollment(supabase, user.id, courseId),
  ]);

  return { hasAccess: profile?.role === "admin" || isEnrollmentActive(enrollment), enrollment };
}

export async function hasCourseAccess(supabase: SupabaseClient, user: User | null, courseId: string): Promise<boolean> {
  const { hasAccess } = await getCourseAccessInfo(supabase, user, courseId);
  return hasAccess;
}
