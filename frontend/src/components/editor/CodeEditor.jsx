import React, { useRef, useCallback, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Sparkles, Split, ChevronRight } from "lucide-react";
import useStore from "../../store/useStore";
import { api } from "../../services/api";
import { useLSP } from "../../hooks/useLSP";

// Single editor pane (reused for both main and split)
function EditorPane({ tabPath, isSplit = false, onClose }) {
  const {
    openTabs, activeTab, closeTab, updateTabContent, markTabSaved,
    selectedProvider, selectedModel, setCmdkOpen, setStatus,
    workspaceSettings,
  } = useStore();

  const editorRef  = useRef(null);
  const monacoRef  = useRef(null);
  const compRef    = useRef(null);
  const versionRef = useRef(1);
  const [saving, setSaving] = useState(false);

  const tabData = openTabs.find(t => t.path === tabPath);
  const { notifyOpen, notifyChange } = useLSP(editorRef, monacoRef, tabPath, tabData?.language);

  const editorSettings = workspaceSettings?.editor || {};

  const saveFile = useCallback(async () => {
    if (!tabPath || !tabData) return;
    setSaving(true); setStatus("Saving…");
    try {
      await api.writeFile(tabPath, tabData.content);
      markTabSaved(tabPath);
      setStatus("Saved ✓");
      setTimeout(() => setStatus("Ready"), 1500);
    } catch (e) { setStatus("Save failed: " + e.message); }
    finally { setSaving(false); }
  }, [tabPath, tabData, markTabSaved, setStatus]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveFile(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (editorRef.current) {
          const sel = editorRef.current.getModel()?.getValueInRange(editorRef.current.getSelection());
          setCmdkOpen(true, { selectedCode: sel || "", language: tabData?.language });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveFile, setCmdkOpen, tabData]);

  const setupAutocomplete = useCallback((monaco) => {
    if (compRef.current) { compRef.current.dispose(); compRef.current = null; }
    if (!workspaceSettings?.ai?.autocompleteEnabled) return;

    compRef.current = monaco.languages.registerInlineCompletionsProvider({ pattern: "**" }, {
      provideInlineCompletions: async (model, position) => {
        const { selectedProvider: prov, selectedModel: mod } = useStore.getState();
        if (!prov) return { items: [] };
        const offset = model.getOffsetAt(position);
        const text   = model.getValue();
        const prefix = text.slice(0, offset);
        const suffix = text.slice(offset);
        if (prefix.slice(-1) !== " " && prefix.slice(-1) !== "\n" && prefix.length % 10 !== 0) return { items: [] };
        try {
          const { completion } = await api.complete({
            providerId: prov, model: mod,
            prefix: prefix.slice(-2000), suffix: suffix.slice(0, 500),
            language: model.getLanguageId(), filepath: tabPath,
          });
          if (!completion?.trim()) return { items: [] };
          return { items: [{ insertText: completion, range: {
            startLineNumber: position.lineNumber, startColumn: position.column,
            endLineNumber: position.lineNumber, endColumn: position.column,
          }}]};
        } catch { return { items: [] }; }
      },
      freeInlineCompletions: () => {},
    });
  }, [tabPath, workspaceSettings]);

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setupAutocomplete(monaco);

    editor.addAction({
      id: `carai-cmdk-${isSplit}`,
      label: "CarAI: Edit with AI (CMD+K)",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => {
        const sel = editor.getModel()?.getValueInRange(editor.getSelection());
        setCmdkOpen(true, { selectedCode: sel || "", language: tabData?.language });
      },
    });

    editor.addAction({
      id: `carai-explain-${isSplit}`,
      label: "CarAI: Explain this code",
      contextMenuGroupId: "carai", contextMenuOrder: 1,
      run: () => {
        const sel = editor.getModel()?.getValueInRange(editor.getSelection());
        if (sel) {
          useStore.getState().addChatMessage({ role: "user", content: `Explain this code:\n\`\`\`${tabData?.language || ""}\n${sel}\n\`\`\`` });
          useStore.getState().setChatOpen(true);
        }
      },
    });

    editor.addAction({
      id: `carai-gotodef-${isSplit}`,
      label: "CarAI: Go to Definition (LSP)",
      contextMenuGroupId: "carai", contextMenuOrder: 2,
      run: async () => {
        const pos = editor.getPosition();
        if (!pos) return;
        // LSP will handle this via Monaco's built-in provider once connected
        editor.trigger("keyboard", "editor.action.revealDefinition", {});
      },
    });

    // Notify LSP of open
    if (tabData?.content) notifyOpen(tabData.content);
  }, [setCmdkOpen, tabData, isSplit, setupAutocomplete, notifyOpen]);

  const handleChange = useCallback((val) => {
    if (!tabPath) return;
    updateTabContent(tabPath, val || "");
    versionRef.current++;
    notifyChange(val || "", versionRef.current);
  }, [tabPath, updateTabContent, notifyChange]);

  if (!tabData) return (
    <div className="editor-empty">
      <div className="editor-empty-content">
        <span className="editor-empty-icon"><Sparkles size={40} /></span>
        <h3>Workspace ready</h3>
        <p>Open a file from the explorer to begin.</p>
        <p className="editor-empty-hint">Ctrl+P — search &nbsp;|&nbsp; Ctrl+K — AI edit &nbsp;|&nbsp; Ctrl+` — terminal</p>
      </div>
    </div>
  );

  const parts = tabData.path.split("/");

  return (
    <div className="editor-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        {parts.map((p, i) => (
          <span key={i} className="breadcrumb-part">
            {i < parts.length - 1 ? <>{p}<ChevronRight size={10} /></> : <strong>{p}</strong>}
          </span>
        ))}
        <div className="breadcrumb-actions">
          <button className="tab-action" onClick={saveFile} title="Save (Ctrl+S)" disabled={saving}>
            <Save size={12} />
          </button>
          <button className="tab-action cmdk-btn" title="AI Edit (Ctrl+K)"
            onClick={() => setCmdkOpen(true, { selectedCode: "", language: tabData.language })}>
            <Sparkles size={12} /> AI edit
          </button>
          {isSplit && <button className="tab-action" onClick={onClose} title="Close split"><X size={12} /></button>}
        </div>
      </div>

      <div className="monaco-wrapper">
        <Editor
          key={tabPath}
          language={tabData.language}
          value={tabData.content}
          theme={workspaceSettings?.ui?.theme || "vs-dark"}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            fontSize: editorSettings.fontSize || 14,
            fontFamily: editorSettings.fontFamily || "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineHeight: 1.6,
            minimap: { enabled: editorSettings.minimap !== false, scale: 0.8 },
            scrollBeyondLastLine: false,
            wordWrap: editorSettings.wordWrap || "off",
            lineNumbers: editorSettings.lineNumbers || "on",
            renderWhitespace: editorSettings.renderWhitespace || "selection",
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 8, bottom: 12 },
            inlineSuggest: { enabled: true },
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            tabCompletion: "on",
            tabSize: editorSettings.tabSize || 2,
            formatOnPaste: true,
            formatOnType: editorSettings.formatOnSave || false,
            showUnused: true,
            showDeprecated: true,
          }}
        />
      </div>
    </div>
  );
}

export default function CodeEditor() {
  const {
    openTabs, activeTab, closeTab, splitTab, closeSplit, openFileSplit,
    setStatus,
  } = useStore();

  const activeTabData = openTabs.find(t => t.path === activeTab);

  return (
    <div className="editor-root">
      {/* Tab bar */}
      <div className="tab-bar">
        {openTabs.map(tab => (
          <div
            key={tab.path}
            className={`tab ${tab.path === activeTab ? "active" : ""}`}
            onClick={() => useStore.getState().openFile(tab)}
            title={tab.path}
          >
            <span className="tab-name">{tab.modified ? "● " : ""}{tab.name}</span>
            <button className="tab-close" onClick={e => { e.stopPropagation(); closeTab(tab.path); }}>
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="tab-bar-actions">
          {activeTabData && !splitTab && (
            <button className="tab-action" title="Split editor"
              onClick={() => activeTabData && openFileSplit(activeTabData)}>
              <Split size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Editor area — main + optional split */}
      <div className={`editor-panes ${splitTab ? "split" : ""}`}>
        <div className="editor-pane-main">
          <EditorPane tabPath={activeTab} />
        </div>
        {splitTab && (
          <div className="editor-pane-split">
            <EditorPane tabPath={splitTab} isSplit onClose={closeSplit} />
          </div>
        )}
      </div>
    </div>
  );
}
