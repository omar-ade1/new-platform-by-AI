import path from "node:path";
import { defineConfig } from "vitest/config";

// إعداد منفصل عن vitest.config.mts — ده بيشغّل اختبارات تكامل حقيقية على RPCs عن طريق
// سيرفر Supabase محلي (لازم `npx supabase start` شغال الأول)، مش دوال خالصة زي الاختبارات
// العادية. شغّلها بـ `npm run test:integration`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/integration/vitest.setup.ts"],
    include: ["tests/integration/**/*.integration.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
