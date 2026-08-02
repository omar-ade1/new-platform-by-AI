import type { SupabaseClient } from "@supabase/supabase-js";

// بيسجّل إن الطالب شاف العنصر ده، أو يزوّد عداد المشاهدة لو شافه قبل كده.
export async function trackContentSeen(supabase: SupabaseClient, userId: string, contentItemId: string) {
  const { data: existing } = await supabase
    .from("content_progress")
    .select("times_seen")
    .eq("user_id", userId)
    .eq("content_item_id", contentItemId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("content_progress")
      .update({ times_seen: existing.times_seen + 1, last_seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("content_item_id", contentItemId);
  } else {
    await supabase.from("content_progress").insert({ user_id: userId, content_item_id: contentItemId });
  }
}
