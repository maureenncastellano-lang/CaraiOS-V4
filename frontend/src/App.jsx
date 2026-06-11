import React, { useEffect, useCallback } from "react";
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
import { api } from "./services/api";
import "./App.css";

const WS_BASE = (process.env.REACT_APP_BACKEND_URL || "http://localhost:3001")
  .replace("http://", "ws://").replace("https://", "wss://");

export default function App() {
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
    api.getProviders().then(p => {
      setProviders(p);
      const configured = Object.entries(p).find(([, v]) => v.configured);
      if (configured && !localStorage.getItem("carai_provider")) setProvider(configured[0]);
    }).catch(() => setStatus("Backend offline — start the server"));

    api.getTree().then(({ tree }) => setFileTree(tree || [])).catch(() => {});
    api.getIndexStatus().then(setIndexStats).catch(() => {});
    api.getSettings().then(s => setWorkspaceSettings(s)).catch(() => {});
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
