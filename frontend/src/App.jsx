import React, { useEffect, useCallback, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
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
import useStore from "./store/useStore";
import { api, BASE } from "./services/api";
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
  } = useStore();

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
      <div className="title-bar">
        <span className="title-logo">⚡ CarAI IDE</span>
        <button className="title-palette-btn" onClick={() => setPaletteOpen(true)}>
          🔍 Search files… <kbd>Ctrl+P</kbd>
        </button>
        <span className="title-hint">Ctrl+K — AI &nbsp;·&nbsp; Ctrl+` — Terminal &nbsp;·&nbsp; Ctrl+Shift+G — Git</span>
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
                <CodeEditor />
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
                {rightPanel === "chat"   && <ChatSidebar />}
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
