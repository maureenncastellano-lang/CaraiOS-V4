import { create } from "zustand";

const useStore = create((set, get) => ({
  // ── File Tree ──────────────────────────────────────────────
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),

  // ── Open Tabs ──────────────────────────────────────────────
  openTabs: [],        // [{ path, name, content, language, modified }]
  activeTab: null,     // path string
  splitTab: null,      // path for right split pane

  openFile: (file) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.path === file.path);
    if (existing) {
      set({ activeTab: file.path });
    } else {
      set({
        openTabs: [...openTabs, { ...file, modified: false }],
        activeTab: file.path,
      });
    }
  },

  openFileSplit: (file) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.path === file.path);
    if (!existing) {
      set({ openTabs: [...openTabs, { ...file, modified: false }] });
    }
    set({ splitTab: file.path });
  },

  closeSplit: () => set({ splitTab: null }),

  closeTab: (filePath) => {
    const { openTabs, activeTab, splitTab } = get();
    const idx = openTabs.findIndex((t) => t.path === filePath);
    const newTabs = openTabs.filter((t) => t.path !== filePath);
    let newActive = activeTab;
    if (activeTab === filePath) newActive = newTabs[Math.max(0, idx - 1)]?.path || null;
    set({
      openTabs: newTabs,
      activeTab: newActive,
      splitTab: splitTab === filePath ? null : splitTab,
    });
  },

  updateTabContent: (filePath, content) => {
    set((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.path === filePath ? { ...t, content, modified: true } : t
      ),
    }));
  },

  markTabSaved: (filePath) => {
    set((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.path === filePath ? { ...t, modified: false } : t
      ),
    }));
  },

  // ── AI Settings ───────────────────────────────────────────
  providers: {},
  setProviders: (p) => set({ providers: p }),
  selectedProvider: localStorage.getItem("carai_provider") || "continueDev",
  selectedModel: localStorage.getItem("carai_model") || "",

  setProvider: (id) => {
    localStorage.setItem("carai_provider", id);
    const { providers } = get();
    const model = providers[id]?.defaultModel || "";
    localStorage.setItem("carai_model", model);
    set({ selectedProvider: id, selectedModel: model });
  },

  setModel: (model) => {
    localStorage.setItem("carai_model", model);
    set({ selectedModel: model });
  },

  // ── Workspace Settings ────────────────────────────────────
  workspaceSettings: null,
  setWorkspaceSettings: (s) => set({ workspaceSettings: s }),

  // ── Chat ──────────────────────────────────────────────────
  chatMessages: [],
  chatOpen: true,
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, { ...msg, id: Date.now() }] })),
  updateLastAssistantMessage: (text) =>
    set((s) => {
      const msgs = [...s.chatMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content: text };
          return { chatMessages: msgs };
        }
      }
      return {};
    }),
  clearChat: () => set({ chatMessages: [] }),
  setChatOpen: (v) => set({ chatOpen: v }),

  // ── Terminal ──────────────────────────────────────────────
  terminalOpen: false,
  setTerminalOpen: (v) => set({ terminalOpen: v }),

  // ── Settings modal ────────────────────────────────────────
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  // ── CMD+K modal ───────────────────────────────────────────
  cmdkOpen: false,
  cmdkSelection: null,
  setCmdkOpen: (open, selection = null) => set({ cmdkOpen: open, cmdkSelection: selection }),

  // ── Command Palette ───────────────────────────────────────
  paletteOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v }),

  // ── Status bar ────────────────────────────────────────────
  statusMessage: "Ready",
  setStatus: (msg) => set({ statusMessage: msg }),

  // ── Problems (LSP diagnostics) ────────────────────────────
  problems: [],        // [{ path, line, col, message, severity, source }]
  setProblems: (p) => set({ problems: p }),
  addProblem: (p) => set((s) => ({ problems: [...s.problems.filter(x => x.path !== p.path || x.line !== p.line), p] })),
  clearProblemsForFile: (path) => set((s) => ({ problems: s.problems.filter(p => p.path !== path) })),
  problemsOpen: false,
  setProblemsOpen: (v) => set({ problemsOpen: v }),

  // ── Search across files ───────────────────────────────────
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
  searchResults: [],
  setSearchResults: (r) => set({ searchResults: r }),

  // ── Git ───────────────────────────────────────────────────
  gitOpen: false,
  setGitOpen: (v) => set({ gitOpen: v }),
  gitStatus: null,
  setGitStatus: (s) => set({ gitStatus: s }),

  // ── Agent ─────────────────────────────────────────────────
  agentOpen: false,
  setAgentOpen: (v) => set({ agentOpen: v }),
  agentActions: [],
  agentRunning: false,
  addAgentAction: (action) => set((s) => ({ agentActions: [...s.agentActions, action] })),
  clearAgentActions: () => set({ agentActions: [] }),
  setAgentRunning: (v) => set({ agentRunning: v }),

  // ── Index ─────────────────────────────────────────────────
  indexStats: null,
  setIndexStats: (s) => set({ indexStats: s }),

  // ── @ mention file picker ─────────────────────────────────
  mentionedFiles: [],
  addMentionedFile: (f) => set((s) => ({
    mentionedFiles: s.mentionedFiles.find(x => x.path === f.path)
      ? s.mentionedFiles : [...s.mentionedFiles, f],
  })),
  removeMentionedFile: (path) => set((s) => ({
    mentionedFiles: s.mentionedFiles.filter(f => f.path !== path),
  })),
  clearMentionedFiles: () => set({ mentionedFiles: [] }),
}));

export default useStore;
