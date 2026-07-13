import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Trash2, Copy, Check, X, AtSign, Database, Bot, Sparkles } from "lucide-react";
import useStore from "../../store/useStore";
import { api } from "../../services/api";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="copy-btn"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function CodeBlock({ children, className }) {
  const lang = className?.replace("language-", "") || "";
  const code = String(children).replace(/\n$/, "");
  return (
    <div className="code-block">
      <div className="code-block-header"><span>{lang}</span><CopyButton text={code} /></div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function ContextBadges({ files }) {
  if (!files?.length) return null;
  return (
    <div className="chat-context-files">
      <span className="ctx-label"><Database size={10} /> Context:</span>
      {files.map(f => (
        <span key={f.path} className="ctx-file-chip" title={`Score: ${f.score}`}>
          {f.path.split("/").pop()}
        </span>
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`chat-message ${isUser ? "user" : "assistant"}`}>
      <div className="chat-avatar">{isUser ? "You" : "AI"}</div>
      <div className="chat-bubble-wrap">
        {msg.contextFiles && <ContextBadges files={msg.contextFiles} />}
        <div className="chat-bubble">
          {isUser ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}

// @file mention picker
function MentionPicker({ query, fileTree, onSelect, onClose }) {
  const flat = [];
  function walk(nodes) {
    for (const n of nodes) {
      if (n.type === "file") flat.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(fileTree);

  const filtered = flat
    .filter(f => f.path.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  if (!filtered.length) return null;

  return (
    <div className="mention-picker">
      {filtered.map(f => (
        <button key={f.path} className="mention-item" onClick={() => onSelect(f)}>
          <span className="mention-name">{f.name}</span>
          <span className="mention-path">{f.path}</span>
        </button>
      ))}
    </div>
  );
}

export default function ChatSidebar() {
  const {
    chatMessages, addChatMessage, updateLastAssistantMessage, clearChat,
    selectedProvider, selectedModel, setChatOpen, chatOpen,
    openTabs, activeTab, setStatus, fileTree,
    mentionedFiles, addMentionedFile, removeMentionedFile, clearMentionedFiles,
    setAgentOpen,
  } = useStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null); // null = closed
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const activeFile = openTabs.find(t => t.path === activeTab);

  // Detect @mention typing
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1 && atIdx === val.length - 1) {
      setMentionQuery("");
    } else if (atIdx !== -1 && !val.slice(atIdx + 1).includes(" ")) {
      setMentionQuery(val.slice(atIdx + 1));
    } else {
      setMentionQuery(null);
    }
  };

  const selectMention = async (file) => {
    try {
      const { content } = await api.readFile(file.path);
      addMentionedFile({ path: file.path, name: file.name, content });
    } catch {}
    // Replace @query with @filename in input
    const atIdx = input.lastIndexOf("@");
    setInput(input.slice(0, atIdx) + `@${file.name} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setLoading(true);

    addChatMessage({ role: "user", content: userText });
    addChatMessage({ role: "assistant", content: "▋" });

    const history = chatMessages.slice(-20).map(m => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });

    try {
      let full = "";
      let contextFiles = null;

      const stream = api.streamChat({
        providerId: selectedProvider,
        model: selectedModel,
        messages: history,
        activeFile: activeFile ? { path: activeFile.path, language: activeFile.language, content: activeFile.content } : undefined,
        mentionedFiles,
      });

      for await (const chunk of stream) {
        if (chunk.type === "context") { contextFiles = chunk.files; continue; }
        if (chunk.error) { full += `\n\n**Error:** ${chunk.error}`; break; }
        if (chunk.text) { full += chunk.text; updateLastAssistantMessage(full); }
      }

      // Attach context files to the assistant message
      if (contextFiles) {
        useStore.setState(s => {
          const msgs = [...s.chatMessages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "assistant") {
              msgs[i] = { ...msgs[i], contextFiles };
              break;
            }
          }
          return { chatMessages: msgs };
        });
      }
    } catch (e) {
      updateLastAssistantMessage(`**Error:** ${e.message}`);
      setStatus("AI error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (mentionQuery !== null && e.key === "Escape") { setMentionQuery(null); return; }
    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`chat-sidebar ${chatOpen ? "open" : "closed"}`}>
      <div className="chat-header">
        <div className="chat-header-title">
          <Sparkles size={13} />
          <span>Intelligence</span>
        </div>
        <div className="chat-header-actions">
          {activeFile && <span className="chat-context-badge" title={activeFile.path}>{activeFile.name}</span>}
          <button title="Open Agent mode" onClick={() => setAgentOpen(true)}><Bot size={13} /></button>
          <button title="Clear chat" onClick={() => { clearChat(); clearMentionedFiles(); }}><Trash2 size={13} /></button>
          <button title="Close" onClick={() => setChatOpen(false)}><X size={13} /></button>
        </div>
      </div>

      {/* Pinned @mention files */}
      {mentionedFiles.length > 0 && (
        <div className="mentioned-files-bar">
          <AtSign size={11} />
          {mentionedFiles.map(f => (
            <span key={f.path} className="mentioned-file-chip">
              {f.name}
              <button onClick={() => removeMentionedFile(f.path)}><X size={9} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div className="chat-empty">
            <p>Ask about your code, architecture, or next move. Type <code>@filename</code> to pin a file.</p>
            <div className="chat-suggestions">
              {["Explain the active file", "Find bugs in this code", "Write tests for this function", "Refactor for readability"].map(s => (
                <button key={s} className="suggestion-chip" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map(msg => <Message key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-wrap">
        {mentionQuery !== null && (
          <MentionPicker
            query={mentionQuery}
            fileTree={fileTree}
            onSelect={selectMention}
            onClose={() => setMentionQuery(null)}
          />
        )}
        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder="Ask DevOS… (@file to pin, Enter to send)"
            disabled={loading}
            rows={3}
          />
          <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? <span className="spinner" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
