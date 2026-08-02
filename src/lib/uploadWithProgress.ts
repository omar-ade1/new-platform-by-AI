import type { SupabaseClient } from "@supabase/supabase-js";

// supabase-js's storage upload() has no progress callback, فبنستخدم createSignedUploadUrl
// ونرفع بـ XMLHttpRequest يدويًا عشان نقدر نتابع نسبة الرفع لحظة بلحظة.
export async function uploadFileWithProgress(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data) {
    return { error: error?.message ?? "تعذّر تجهيز الرفع" };
  }

  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ error: null });
      } else {
        resolve({ error: `فشل الرفع (${xhr.status})` });
      }
    };

    xhr.onerror = () => resolve({ error: "حصل خطأ في الاتصال أثناء الرفع" });

    xhr.send(body);
  });
}
