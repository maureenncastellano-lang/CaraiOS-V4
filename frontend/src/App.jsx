import React, { useEffect, useCallback, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Bot, Brain, Command, GitBranch, MoonStar, Search, Settings, Sparkles, SunMedium, TerminalSquare } from "lucide-react";
import FileTree from "./components/editor/FileTree";
import CodeEditor from "./components/editor/CodeEditor";
import ChatSidebar from "./components/sidebar/ChatSidebar";
import AgentPanel from "./components/sidebar/AgentPanel";
import GitPanel from "./components/sidebar/GitPanel";
import SearchPanel from "./components/sidebar/SearchPanel";
import TerminalPanel from "./components/terminal/TerminalPanel";
import StatusBar from "./components/editor/StatusBar";
import SettingsModal from "./components/settings/SettingsModal";
import CmdKModal from "./components/editor/CmdKModal";
import CommandPalette from "./components/editor/CommandPalette";
import ProblemsPanel from "./components/editor/ProblemsPanel";
import DevOSHome from "./components/os/DevOSHome";
import { AgentStatusCard, NotificationCenter, SystemMonitor } from "./components/os/DevOSSystemCards";
import useStore from "./store/useStore";
import { api, BASE } from "./services/api";
import { normalizeTheme } from "./services/theme";
import "./App.css";

const WS_BASE = (BASE || "https://devos.carai.agency")
  .replace("http://", "ws://")
  .replace("https://", "wss://");

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error("React render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app error-state">
          <h2>Something went wrong</h2>
          <p>The interface hit an unexpected error. Please refresh the page and try again.</p>
          <pre>{this.state.error?.message || "Unknown error"}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const [bootError, setBootError] = useState(null);
  const {
    setFileTree, setProviders, setProvider,
    chatOpen, terminalOpen, agentOpen, gitOpen, searchOpen, problemsOpen,
    setStatus, setIndexStats, setWorkspaceSettings, setGitStatus,
    workspaceSettings,
    setPaletteOpen, setSearchOpen, setSettingsOpen, setGitOpen,
    setTerminalOpen, setChatOpen, setAgentOpen, setProblemsOpen,
    activeTab,
  } = useStore();

  const currentThemeValue = workspaceSettings?.ui?.theme || "vs-dark";
  const currentThemeMode = normalizeTheme(currentThemeValue);

  // ── Boot: load providers, tree, settings ─────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const providers = await api.getProviders();
        setProviders(providers || {});
        const configured = Object.entries(providers || {}).find(([, v]) => v?.configured);
        if (configured && !localStorage.getItem("carai_provider")) setProvider(configured[0]);
      } catch (error) {
        console.error("Provider boot error:", error);
        setStatus(`Backend unavailable: ${error.message || "connection failed"}`);
        setBootError(error);
      }

      try {
        const treeResponse = await api.getTree();
        setFileTree(treeResponse?.tree || []);
      } catch (error) {
        console.error("Tree boot error:", error);
      }

      try {
        const index = await api.getIndexStatus();
        setIndexStats(index);
      } catch (error) {
        console.error("Index boot error:", error);
      }

      try {
        const settings = await api.getSettings();
        setWorkspaceSettings(settings);
      } catch (error) {
        console.error("Settings boot error:", error);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentThemeMode);
  }, [currentThemeMode]);

  const handleThemeToggle = useCallback(() => {
    const nextThemeValue = normalizeTheme(currentThemeValue) === "day" ? "vs-dark" : "light";
    setWorkspaceSettings({
      ...(workspaceSettings || {}),
      ui: {
        ...(workspaceSettings?.ui || {}),
        theme: nextThemeValue,
      },
    });
  }, [currentThemeValue, setWorkspaceSettings, workspaceSettings]);

  const openRightPanel = useCallback((panel) => {
    setAgentOpen(panel === "agent");
    setGitOpen(panel === "git");
    setSearchOpen(panel === "search");
    setChatOpen(panel === "chat");
  }, [setAgentOpen, setChatOpen, setGitOpen, setSearchOpen]);

  const handleHomeAction = useCallback((action) => {
    switch (action) {
      case "build":
        setPaletteOpen(true);
        break;
      case "agents":
        openRightPanel("agent");
        break;
      case "brain":
        openRightPanel("chat");
        break;
      case "search":
        openRightPanel("search");
        break;
      case "terminal":
        setTerminalOpen(true);
        break;
      case "git":
        openRightPanel("git");
        break;
      case "settings":
        setSettingsOpen(true);
        break;
      default:
        break;
    }
  }, [openRightPanel, setPaletteOpen, setSettingsOpen, setTerminalOpen]);

  // ── Auto-save via settings ────────────────────────────────
  useEffect(() => {
    if (!workspaceSettings?.editor?.autoSave) return;
    const delay = workspaceSettings.editor.autoSaveDelay || 1000;
    const interval = setInterval(() => {
      const { openTabs, activeTab } = useStore.getState();
      const tab = openTabs.find(t => t.path === activeTab && t.modified);
      if (tab) api.writeFile(tab.path, tab.content).then(() => useStore.getState().markTabSaved(tab.path));
    }, delay);
    return () => clearInterval(interval);
  }, [workspaceSettings?.editor?.autoSave, workspaceSettings?.editor?.autoSaveDelay]);

  // ── Live file watcher ─────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}?type=filewatcher`);
    ws.onmessage = () => api.getTree().then(({ tree }) => setFileTree(tree || [])).catch(() => {});
    return () => ws.close();
  }, []);

  // ── Auto-fetch git on open ────────────────────────────────
  useEffect(() => {
    if (workspaceSettings?.git?.autofetch) {
      api.gitStatus().then(setGitStatus).catch(() => {});
    }
  }, [workspaceSettings]);

  // ── Global keyboard shortcuts ─────────────────────────────
  const handleGlobalKey = useCallback((e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "p" && !e.shiftKey)  { e.preventDefault(); setPaletteOpen(true); }
    if (mod && e.key === "`")                  { e.preventDefault(); setTerminalOpen(!useStore.getState().terminalOpen); }
    if (mod && e.shiftKey && e.key === "L")    { e.preventDefault(); setChatOpen(!useStore.getState().chatOpen); }
    if (mod && e.shiftKey && e.key === "F")    { e.preventDefault(); setSearchOpen(true); }
    if (mod && e.shiftKey && e.key === "G")    { e.preventDefault(); setGitOpen(!useStore.getState().gitOpen); }
    if (mod && e.key === ",")                  { e.preventDefault(); setSettingsOpen(true); }
    if (mod && e.shiftKey && e.key === "M")    { e.preventDefault(); setProblemsOpen(!useStore.getState().problemsOpen); }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  // Which right panel is open
  const rightPanel = agentOpen ? "agent" : gitOpen ? "git" : searchOpen ? "search" : chatOpen ? "chat" : null;

  if (bootError) {
    return (
      <div className="app error-state">
        <h2>Connection issue</h2>
        <p>The app could not reach the backend at {BASE}.</p>
        <p>Please refresh or contact support if this persists.</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Title bar */}
      <div className="devos-title-bar">
        <div className="devos-title-brand">
          <div className="devos-title-icon">
            <Sparkles size={14} />
          </div>
          <div>
            <strong>DevOS</strong>
            <span>AI engineering workstation</span>
          </div>
        </div>
        <button className="devos-command-bar" onClick={() => setPaletteOpen(true)}>
          <Command size={14} />
          <span>Search files, actions, agents…</span>
          <kbd>Ctrl+P</kbd>
        </button>
        <div className="devos-title-actions">
          <button className={`devos-pill devos-theme-toggle ${currentThemeMode === "day" ? "active" : ""}`} onClick={handleThemeToggle}>
            <span className="devos-theme-knob" />
            {currentThemeMode === "day" ? <MoonStar size={13} /> : <SunMedium size={13} />}
            <span>{currentThemeMode === "day" ? "Night" : "Day"}</span>
          </button>
          <button className="devos-pill" onClick={() => handleHomeAction("build")}>
            <Command size={13} /> Build
          </button>
          <button className="devos-pill" onClick={() => handleHomeAction("agents")}>
            <Bot size={13} /> Agents
          </button>
          <button className="devos-pill" onClick={() => handleHomeAction("brain")}>
            <Brain size={13} /> Brain
          </button>
          <button className="devos-pill" onClick={() => handleHomeAction("search")}>
            <Search size={13} /> Search
          </button>
          <button className="devos-pill" onClick={() => handleHomeAction("terminal")}>
            <TerminalSquare size={13} /> Terminal
          </button>
          <button className="devos-pill" onClick={() => handleHomeAction("settings")}>
            <Settings size={13} /> Settings
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout">
        <PanelGroup direction="horizontal" className="panel-group">
          {/* File tree */}
          <Panel defaultSize={16} minSize={10} maxSize={35} className="panel-file-tree">
            <FileTree />
          </Panel>
          <PanelResizeHandle className="resize-handle" />

          {/* Editor + terminal + problems */}
          <Panel minSize={30} className="panel-editor">
            <PanelGroup direction="vertical">
              <Panel minSize={25}>
                {activeTab ? <CodeEditor /> : <DevOSHome onAction={handleHomeAction} />}
              </Panel>
              {problemsOpen && (
                <>
                  <PanelResizeHandle className="resize-handle horizontal" />
                  <Panel defaultSize={22} minSize={12} maxSize={50}>
                    <ProblemsPanel />
                  </Panel>
                </>
              )}
              {terminalOpen && (
                <>
                  <PanelResizeHandle className="resize-handle horizontal" />
                  <Panel defaultSize={28} minSize={12} maxSize={60}>
                    <TerminalPanel />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* Right panel: chat / agent / git / search */}
          {rightPanel && (
            <>
              <PanelResizeHandle className="resize-handle" />
              <Panel defaultSize={26} minSize={18} maxSize={48} className="panel-chat">
                {rightPanel === "agent"  && <AgentPanel />}
                {rightPanel === "git"    && <GitPanel />}
                {rightPanel === "search" && <SearchPanel />}
                {rightPanel === "chat"   && (
                  <div className="devos-intelligence-panel">
                    <div className="devos-intelligence-header">
                      <div>
                        <p className="devos-intelligence-eyebrow">AI command center</p>
                        <h3>Nuha is ready</h3>
                      </div>
                      <span className="devos-status-pill">3 agents working</span>
                    </div>
                    <div className="devos-intelligence-grid">
                      <AgentStatusCard />
                      <SystemMonitor />
                      <NotificationCenter />
                    </div>
                    <div className="devos-chat-surface">
                      <ChatSidebar />
                    </div>
                  </div>
                )}
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      <StatusBar />
      <SettingsModal />
      <CmdKModal />
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
