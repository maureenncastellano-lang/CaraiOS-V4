import React from "react";
import { Activity, Bot, Cpu, HardDrive, MessageSquare, Sparkles, TerminalSquare, Zap } from "lucide-react";

function StatPill({ label, value, accent = false }) {
  return (
    <div className={`os-stat-pill ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AgentStatusCard({
  name = "Nuha",
  task = "Refactoring auth flow",
  model = "Claude 3.7",
  cpu = "24%",
  memory = "1.8 GB",
  progress = 68,
  status = "Working",
}) {
  return (
    <div className="os-card os-agent-card">
      <div className="os-card-header">
        <div className="os-card-title-row">
          <Bot size={16} />
          <span>Agent Presence</span>
        </div>
        <span className="os-badge">{status}</span>
      </div>

      <div className="os-agent-main">
        <div>
          <h4>{name}</h4>
          <p>{task}</p>
        </div>
        <div className="os-progress-track">
          <div className="os-progress-fill" style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
        </div>
      </div>

      <div className="os-stats-grid">
        <StatPill label="Model" value={model} />
        <StatPill label="CPU" value={cpu} accent />
        <StatPill label="RAM" value={memory} />
      </div>
    </div>
  );
}

export function TerminalStream({ lines = [] }) {
  const items = lines.length ? lines : [
    "[08:13] Build pipeline ready",
    "[08:14] Deploy target warmed",
    "[08:15] Agent watching for changes",
  ];

  return (
    <div className="os-card">
      <div className="os-card-header">
        <div className="os-card-title-row">
          <TerminalSquare size={16} />
          <span>Terminal Stream</span>
        </div>
      </div>
      <div className="os-terminal-stream">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="os-stream-line">
            <span className="os-stream-dot" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationCenter({ events = [] }) {
  const items = events.length ? events : [
    { title: "Build complete", detail: "Web app compiled in 1.4s" },
    { title: "Agent ready", detail: "Nuha prepared deployment review" },
    { title: "Search indexed", detail: "4.2k workspace embeddings refreshed" },
  ];

  return (
    <div className="os-card">
      <div className="os-card-header">
        <div className="os-card-title-row">
          <Sparkles size={16} />
          <span>Notifications</span>
        </div>
      </div>
      <div className="os-notification-list">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="os-notification-item">
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityTimeline({ items = [] }) {
  const entries = items.length ? items : [
    { title: "Build", detail: "Production bundle optimized" },
    { title: "Deploy", detail: "Preview environment refreshed" },
    { title: "Git", detail: "Branch synced with remote" },
  ];

  return (
    <div className="os-card">
      <div className="os-card-header">
        <div className="os-card-title-row">
          <Activity size={16} />
          <span>Activity Timeline</span>
        </div>
      </div>
      <div className="os-timeline-list">
        {entries.map((entry, index) => (
          <div key={`${entry.title}-${index}`} className="os-timeline-item">
            <div className="os-timeline-marker" />
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemMonitor({ cpu = "41%", ram = "63%", models = "3", services = "12" }) {
  return (
    <div className="os-card">
      <div className="os-card-header">
        <div className="os-card-title-row">
          <Cpu size={16} />
          <span>System Monitor</span>
        </div>
      </div>
      <div className="os-monitor-grid">
        <div className="os-monitor-row">
          <span>CPU</span>
          <div className="os-meter"><div style={{ width: cpu }} /></div>
          <strong>{cpu}</strong>
        </div>
        <div className="os-monitor-row">
          <span>RAM</span>
          <div className="os-meter"><div style={{ width: ram }} /></div>
          <strong>{ram}</strong>
        </div>
        <div className="os-monitor-row">
          <span>Models</span>
          <strong>{models}</strong>
        </div>
        <div className="os-monitor-row">
          <span>Services</span>
          <strong>{services}</strong>
        </div>
      </div>
    </div>
  );
}

export function OsShellPanel({ children, title, icon: Icon }) {
  return (
    <div className="os-shell-panel">
      {title && (
        <div className="os-shell-panel-title">
          {Icon ? <Icon size={14} /> : <Zap size={14} />}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
