export type ThemeId = "default" | "green" | "dark";

export const THEME_STORAGE_KEY = "theme";

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "default", label: "بنفسجي", swatch: "#2D1B69" },
  { id: "green", label: "أخضر", swatch: "#1E6B3A" },
  { id: "dark", label: "داكن", swatch: "#756B9E" },
];

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem(THEME_STORAGE_KEY, id);
}

export function getStoredTheme(): ThemeId {
  const stored = document.documentElement.getAttribute("data-theme");
  return (THEMES.some((t) => t.id === stored) ? stored : "default") as ThemeId;
}
