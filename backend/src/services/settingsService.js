const fs = require("fs");
const path = require("path");

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";
const SETTINGS_PATH = path.join(WORKSPACE_ROOT, ".carai", "settings.json");

const DEFAULTS = {
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: "off",
    minimap: true,
    lineNumbers: "on",
    renderWhitespace: "selection",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    formatOnSave: false,
    autoSave: false,
    autoSaveDelay: 1000,
  },
  ai: {
    autocompleteEnabled: true,
    autocompleteDelay: 500,
    autocompleteMinLength: 3,
    contextLines: 80,
    useCodebaseContext: true,
  },
  ui: {
    theme: "vs-dark",
    sidebarWidth: 220,
    terminalFontSize: 13,
    showBreadcrumbs: true,
  },
  git: {
    autofetch: false,
    confirmBeforePush: true,
  },
};

function load() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
      return deepMerge(DEFAULTS, raw);
    }
  } catch {}
  return { ...DEFAULTS };
}

function save(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}

function patch(partial) {
  const current = load();
  const updated = deepMerge(current, partial);
  return save(updated);
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override || {})) {
    if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
      out[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      out[key] = override[key];
    }
  }
  return out;
}

module.exports = { load, save, patch, DEFAULTS };
