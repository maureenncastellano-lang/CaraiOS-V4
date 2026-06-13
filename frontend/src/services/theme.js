const THEME_MAP = {
  "vs-dark": "night",
  light: "day",
  "hc-black": "hacker",
  night: "night",
  day: "day",
  hacker: "hacker",
};

const MONACO_THEME_MAP = {
  day: "light",
  night: "vs-dark",
  hacker: "hc-black",
};

const TERMINAL_THEME_MAP = {
  day: {
    background: "#f4efe6",
    foreground: "#1f2937",
    cursor: "#0f766e",
    selectionBackground: "#cfe8e4",
    black: "#111827",
    red: "#b91c1c",
    green: "#15803d",
    yellow: "#a16207",
    blue: "#0f766e",
    magenta: "#7c3aed",
    cyan: "#0e7490",
    white: "#374151",
  },
  night: {
    background: "#0d1117",
    foreground: "#c9d1d9",
    cursor: "#58a6ff",
    selectionBackground: "#264f78",
    black: "#484f58",
    red: "#ff7b72",
    green: "#3fb950",
    yellow: "#d29922",
    blue: "#58a6ff",
    magenta: "#bc8cff",
    cyan: "#39c5cf",
    white: "#b1bac4",
  },
  hacker: {
    background: "#050a08",
    foreground: "#a7f3a0",
    cursor: "#22c55e",
    selectionBackground: "rgba(34, 197, 94, 0.24)",
    black: "#0d1a12",
    red: "#fb7185",
    green: "#4ade80",
    yellow: "#bef264",
    blue: "#22c55e",
    magenta: "#86efac",
    cyan: "#34d399",
    white: "#dcfce7",
  },
};

export function normalizeTheme(theme) {
  return THEME_MAP[theme] || "night";
}

export function getThemeLabel(theme) {
  switch (normalizeTheme(theme)) {
    case "day": return "Day";
    case "hacker": return "Hacker";
    default: return "Night";
  }
}

export function getMonacoTheme(theme) {
  return MONACO_THEME_MAP[normalizeTheme(theme)] || "vs-dark";
}

export function getTerminalTheme(theme) {
  return TERMINAL_THEME_MAP[normalizeTheme(theme)] || TERMINAL_THEME_MAP.night;
}

export function getThemeAccent(theme) {
  switch (normalizeTheme(theme)) {
    case "day": return "#0f766e";
    case "hacker": return "#22c55e";
    default: return "#58a6ff";
  }
}

export function getThemeBadge(theme) {
  switch (normalizeTheme(theme)) {
    case "day": return "Day";
    case "hacker": return "Hacker";
    default: return "Night";
  }
}

export function toggleDayNightTheme(theme) {
  return normalizeTheme(theme) === "day" ? "night" : "day";
}
