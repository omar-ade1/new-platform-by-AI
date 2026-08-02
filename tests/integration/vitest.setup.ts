import WebSocket from "ws";

// Node 20 (اللي شغال بيه المشروع دلوقتي) معندوش WebSocket أصلي — و@supabase/supabase-js
// بيحتاجه وقت إنشاء أي client حتى لو مش هنستخدم realtime أصلاً. الحل الرسمي المقترح من
// Supabase نفسها لحد ما نرقّي لـ Node 22+: نديله polyfill بمكتبة ws قبل أي import للـ client.
if (!globalThis.WebSocket) {
  // @ts-expect-error - ws's WebSocket implementation is compatible enough for supabase-js's usage
  globalThis.WebSocket = WebSocket;
}
