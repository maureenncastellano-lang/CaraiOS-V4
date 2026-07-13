import React from "react";
import { ArrowRight, Bot, Compass, Cpu, Layers3, MessageSquareText, Sparkles, TerminalSquare, Zap } from "lucide-react";

const quickActions = [
  {
    title: "Build",
    description: "Create applications with AI assistance",
    shortcut: "⌘B",
    icon: Zap,
    accent: "violet",
    action: "build",
  },
  {
    title: "Agents",
    description: "Manage autonomous workers",
    shortcut: "⌘A",
    icon: Bot,
    accent: "cyan",
    action: "agents",
  },
  {
    title: "Brain",
    description: "Open the live intelligence workspace",
    shortcut: "⌘⇧L",
    icon: Sparkles,
    accent: "violet",
    action: "brain",
  },
  {
    title: "Search",
    description: "Find anything instantly",
    shortcut: "⌘⇧F",
    icon: Compass,
    accent: "cyan",
    action: "search",
  },
  {
    title: "Terminal",
    description: "Control your environment",
    shortcut: "⌘`",
    icon: TerminalSquare,
    accent: "violet",
    action: "terminal",
  },
  {
    title: "Settings",
    description: "Tune workspace behavior and appearance",
    shortcut: "⌘,",
    icon: MessageSquareText,
    accent: "cyan",
    action: "settings",
  },
];

export default function DevOSHome({ onAction }) {
  return (
    <div className="devos-home-shell">
      <div className="devos-ambient ambient-one" />
      <div className="devos-ambient ambient-two" />

      <section className="devos-hero-panel">
        <div className="devos-hero-copy">
          <div className="devos-eyebrow">
            <Layers3 size={14} />
            <span>Lightning DevOS</span>
          </div>
          <h1>Your AI Development Operating System</h1>
          <p>Build. Automate. Deploy. Collaborate with intelligent agents inside a calm, premium workstation.</p>
          <div className="devos-hero-actions">
            <button className="devos-primary-btn">
              Open Composer
              <ArrowRight size={14} />
            </button>
            <button className="devos-secondary-btn">
              <Cpu size={14} /> System status
            </button>
          </div>
        </div>

        <div className="devos-hero-status">
          <div className="devos-presence-card">
            <div className="devos-presence-indicator" />
            <div>
              <strong>Nuha is ready</strong>
              <p>3 agents working · optimization suggestions available</p>
            </div>
          </div>
          <div className="devos-hero-metrics">
            <div>
              <strong>14</strong>
              <span>Active contexts</span>
            </div>
            <div>
              <strong>97%</strong>
              <span>Signal clarity</span>
            </div>
          </div>
        </div>
      </section>

      <section className="devos-quick-actions">
        {quickActions.map(({ title, description, shortcut, icon: Icon, accent, action }) => (
          <button key={title} className={`devos-action-card ${accent}`} onClick={() => onAction?.(action)}>
            <div className="devos-action-icon">
              <Icon size={18} />
            </div>
            <div className="devos-action-copy">
              <span>{title}</span>
              <p>{description}</p>
            </div>
            <div className="devos-action-shortcut">{shortcut}</div>
          </button>
        ))}
      </section>
    </div>
  );
}
