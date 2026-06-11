import React from "react";
import { Terminal, MessageSquare, Settings, GitBranch, Bot, Database,
         Search, AlertCircle, AlertTriangle, Split, SunMedium, MoonStar } from "lucide-react";
import useStore from "../../store/useStore";
import { api } from "../../services/api";
import { normalizeTheme, toggleDayNightTheme } from "../../services/theme";

export default function StatusBar() {
  const {
    statusMessage, terminalOpen, setTerminalOpen,
    chatOpen, setChatOpen, setSettingsOpen,
    agentOpen, setAgentOpen,
    gitOpen, setGitOpen, gitStatus,
    searchOpen, setSearchOpen,
    problemsOpen, setProblemsOpen,
    selectedProvider, selectedModel, providers,
    workspaceSettings, setWorkspaceSettings,
    openTabs, activeTab, indexStats, problems,
    splitTab, closeSplit, openFileSplit,
  } = useStore();

  const activeTab_ = openTabs.find(t => t.path === activeTab);
  const providerInfo = providers[selectedProvider];
  const errors   = problems.filter(p => p.severity === "error").length;
  const warnings = problems.filter(p => p.severity === "warning").length;
  const theme = normalizeTheme(workspaceSettings?.ui?.theme);

  const togglePanel = (panel, setter, current) => {
    // Close others, toggle this one
    if (panel !== "chat")    setChatOpen(false);
    if (panel !== "agent")   setAgentOpen(false);
    if (panel !== "git")     setGitOpen(false);
    if (panel !== "search")  setSearchOpen(false);
    setter(!current);
  };

  const toggleTheme = async () => {
    const nextTheme = toggleDayNightTheme(theme);
    try {
      const updated = await api.patchSettings({ ui: { theme: nextTheme } });
      setWorkspaceSettings(updated);
    } catch {
      setWorkspaceSettings({
        ...(workspaceSettings || {}),
        ui: { ...(workspaceSettings?.ui || {}), theme: nextTheme },
      });
    }
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item status-branch">
          <GitBranch size={11} />
          {gitStatus?.branch || "main"}
          {gitStatus?.ahead > 0  && <span className="git-ahead-badge">↑{gitStatus.ahead}</span>}
          {gitStatus?.behind > 0 && <span className="git-behind-badge">↓{gitStatus.behind}</span>}
        </span>
        <span className="status-item">{statusMessage}</span>
        {indexStats?.documents > 0 && (
          <span className="status-item" title={`${indexStats.documents} indexed chunks`}>
            <Database size={10} /> {indexStats.documents}
          </span>
        )}
      </div>

      <div className="status-right">
        {/* Problems count */}
        <button className={`status-item status-btn ${problemsOpen?"active":""}`}
          onClick={() => togglePanel("problems", setProblemsOpen, problemsOpen)}
          title="Problems (Ctrl+Shift+M)">
          {errors > 0   && <><AlertCircle size={11} color="#f85149" /> {errors}</>}
          {warnings > 0 && <><AlertTriangle size={11} color="#d29922" /> {warnings}</>}
          {errors === 0 && warnings === 0 && <><AlertCircle size={11} /> 0</>}
        </button>

        {/* Active file info */}
        {activeTab_ && (
          <>
            <span className="status-item">{activeTab_.language}</span>
            <span className="status-item status-filepath" title={activeTab_.path}>
              {activeTab_.path.split("/").slice(-2).join("/")}
            </span>
            {!splitTab && (
              <button className="status-item status-btn" title="Split editor"
                onClick={() => { const t = openTabs.find(x=>x.path===activeTab); if(t) openFileSplit(t); }}>
                <Split size={11} />
              </button>
            )}
            {splitTab && (
              <button className="status-item status-btn active" title="Close split" onClick={closeSplit}>
                <Split size={11} />
              </button>
            )}
          </>
        )}

        {/* Provider badge */}
        {providerInfo && (
          <button className="status-item status-btn" onClick={() => setSettingsOpen(true)} title="AI Provider (Ctrl+,)">
            {providerInfo.icon} {(selectedModel || providerInfo.defaultModel || "").split("/").pop().slice(0,18)}
          </button>
        )}

        {/* Panel toggles */}
        <button className={`status-item status-btn ${gitOpen?"active":""}`}
          onClick={() => togglePanel("git", setGitOpen, gitOpen)} title="Git (Ctrl+Shift+G)">
          <GitBranch size={11} /> Git
        </button>
        <button className={`status-item status-btn ${searchOpen?"active":""}`}
          onClick={() => togglePanel("search", setSearchOpen, searchOpen)} title="Search (Ctrl+Shift+F)">
          <Search size={11} />
        </button>
        <button className={`status-item status-btn ${agentOpen?"active":""}`}
          onClick={() => togglePanel("agent", setAgentOpen, agentOpen)} title="Agent">
          <Bot size={11} /> Agent
        </button>
        <button className={`status-item status-btn ${chatOpen&&!agentOpen&&!gitOpen&&!searchOpen?"active":""}`}
          onClick={() => togglePanel("chat", setChatOpen, chatOpen)} title="Chat (Ctrl+Shift+L)">
          <MessageSquare size={11} />
        </button>
        <button className="status-item status-btn theme-toggle-btn" onClick={toggleTheme} title="Toggle day/night theme">
          {theme === "day" ? <MoonStar size={11} /> : <SunMedium size={11} />} {theme === "hacker" ? "Hacker" : theme === "day" ? "Day" : "Night"}
        </button>
        <button className={`status-item status-btn ${terminalOpen?"active":""}`}
          onClick={() => setTerminalOpen(!terminalOpen)} title="Terminal (Ctrl+`)">
          <Terminal size={11} />
        </button>
        <button className="status-item status-btn" onClick={() => setSettingsOpen(true)} title="Settings (Ctrl+,)">
          <Settings size={11} />
        </button>
      </div>
    </div>
  );
}
